import bcrypt
import jwt
import pytest
from fastapi import HTTPException

from backend.services import auth
from backend.config.api import settings


class FakeCursor:
    def __init__(self, user):
        self.user = user
        self.query = None
        self.parameters = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, query, parameters):
        self.query = query
        self.parameters = parameters

    def fetchone(self):
        if self.user and self.parameters in (
            (self.user["username"],),
            (self.user["user_id"],),
        ):
            return self.user
        return None


class FakeConnection:
    def __init__(self, user):
        self.cursor_instance = FakeCursor(user)
        self.closed = False

    def cursor(self):
        return self.cursor_instance

    def close(self):
        self.closed = True


def make_user(password, is_active=True, must_change_password=False):
    return {
        "user_id": 1,
        "username": "havy",
        "password": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii"),
        "role": "Admin",
        "is_active": is_active,
        "must_change_password": must_change_password,
    }

def test_authenticates_exact_username_and_bcrypt_password(monkeypatch):
    connection = FakeConnection(make_user("12345"))
    monkeypatch.setattr(auth, "get_connection", lambda: connection)
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "a-test-secret-key-that-is-long-enough")

    result = auth.authenticate_user("havy", "12345")

    assert result["user_id"] == 1
    assert result["username"] == "havy"
    assert result["role"] == "Admin"
    assert result["must_change_password"] is False

    assert result["token_type"] == "bearer"

    claims = jwt.decode(
        result["access_token"],
        settings.JWT_SECRET_KEY,
        algorithms=["HS256"],
    )
    assert claims["sub"] == "1"

    assert connection.cursor_instance.parameters == ("havy",)
    assert "WHERE BINARY username = BINARY %s" in connection.cursor_instance.query
    assert connection.closed


@pytest.mark.parametrize(
    ("username", "password", "active"),
    [
        ("havy", "wrong", True),
        ("Havy", "12345", True),
        ("havy", "12345", False),
    ],
)
def test_rejects_invalid_or_inactive_login(monkeypatch, username, password, active):
    connection = FakeConnection(make_user("12345", is_active=active))
    monkeypatch.setattr(auth, "get_connection", lambda: connection)

    with pytest.raises(HTTPException) as error:
        auth.authenticate_user(username, password)

    assert error.value.status_code == 401
    assert connection.closed


def test_hash_password_returns_a_bcrypt_hash():
    hashed_password = auth.hash_password("12345")

    assert hashed_password != "12345"
    assert bcrypt.checkpw(b"12345", hashed_password.encode("ascii"))


def test_current_user_uses_active_database_role(monkeypatch):
    user = make_user("12345")
    connection = FakeConnection(user)
    monkeypatch.setattr(auth, "get_connection", lambda: connection)
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "a-test-secret-key-that-is-long-enough")
    token = auth._create_access_token(user)
    credentials = auth.HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )

    current_user = auth.get_current_user(credentials)

    assert current_user["role"] == "Admin"
    assert connection.cursor_instance.parameters == (user["user_id"],)
    assert connection.closed


def test_role_dependency_rejects_employee_from_management_actions():
    dependency = auth.require_roles("Admin", "Manager")

    with pytest.raises(HTTPException) as error:
        dependency({"role": "Employee"})

    assert error.value.status_code == 403
