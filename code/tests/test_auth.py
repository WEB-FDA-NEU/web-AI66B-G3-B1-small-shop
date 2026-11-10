import bcrypt
import pytest
from fastapi import HTTPException

from backend.services import auth


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
        if self.user and self.parameters == (self.user["username"],):
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


def make_user(password, is_active=True):
    return {
        "user_id": 1,
        "username": "havy",
        "password": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii"),
        "role": "Admin",
        "is_active": is_active,
    }


def test_authenticates_exact_username_and_bcrypt_password(monkeypatch):
    connection = FakeConnection(make_user("12345"))
    monkeypatch.setattr(auth, "get_connection", lambda: connection)

    result = auth.authenticate_user("havy", "12345")

    assert result == {"user_id": 1, "username": "havy", "role": "Admin"}
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
