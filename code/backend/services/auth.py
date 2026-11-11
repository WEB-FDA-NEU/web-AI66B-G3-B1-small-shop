import os
import secrets
import sys
import threading
import time
from typing import Any, Dict

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection

_SESSION_TTL_SECONDS = 12 * 60 * 60
_sessions: Dict[str, tuple[int, float]] = {}
_sessions_lock = threading.Lock()
_bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plaintext password before storing it for account creation or updates."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def _create_session(user_id: int) -> str:
    now = time.time()
    token = secrets.token_urlsafe(32)
    with _sessions_lock:
        expired_tokens = [
            session_token
            for session_token, (_, expires_at) in _sessions.items()
            if expires_at <= now
        ]
        for session_token in expired_tokens:
            del _sessions[session_token]
        _sessions[token] = (user_id, now + _SESSION_TTL_SECONDS)
    return token


def revoke_user_sessions(user_id: int) -> None:
    with _sessions_lock:
        expired_or_user_tokens = [
            token
            for token, (session_user_id, _) in _sessions.items()
            if session_user_id == user_id
        ]
        for token in expired_or_user_tokens:
            del _sessions[token]


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with _sessions_lock:
        session = _sessions.get(credentials.credentials)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session is invalid or expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id, expires_at = session
        if expires_at <= time.time():
            del _sessions[credentials.credentials]
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session is invalid or expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id, username, role, is_active, must_change_password
                FROM users
                WHERE user_id = %s
                """,
                (user_id,),
            )
            user = cursor.fetchone()
    finally:
        connection.close()

    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is unavailable. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_completed_user(
    user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    if user["must_change_password"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required.",
        )
    return user


def require_user_manager(
    user: Dict[str, Any] = Depends(require_completed_user),
) -> Dict[str, Any]:
    if user["role"] not in {"Admin", "Manager"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and managers can manage users.",
        )
    return user


def authenticate_user(username: str, password: str) -> Dict[str, Any]:
    """Authenticate an exact username/password pair and return non-sensitive user data."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id, username, password, role, is_active,
                       must_change_password
                FROM users
                WHERE BINARY username = BINARY %s;
                """,
                (username,),
            )
            user = cursor.fetchone()

        password_matches = False
        if user:
            try:
                password_matches = bcrypt.checkpw(
                    password.encode("utf-8"),
                    user["password"].encode("ascii"),
                )
            except (TypeError, ValueError, UnicodeError):
                password_matches = False

        if not user or not password_matches or not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        return {
            "user_id": user["user_id"],
            "username": user["username"],
            "role": user["role"],
            "must_change_password": bool(user["must_change_password"]),
            "access_token": _create_session(user["user_id"]),
        }
    finally:
        connection.close()


def change_password(user_id: int, new_password: str) -> None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT password FROM users WHERE user_id = %s AND is_active = TRUE",
                (user_id,),
            )
            user = cursor.fetchone()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account is unavailable. Please sign in again.",
                )
            if bcrypt.checkpw(
                new_password.encode("utf-8"),
                user["password"].encode("ascii"),
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Choose a password different from your current password.",
                )
            cursor.execute(
                """
                UPDATE users
                SET password = %s, must_change_password = FALSE
                WHERE user_id = %s
                """,
                (hash_password(new_password), user_id),
            )
            connection.commit()
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
