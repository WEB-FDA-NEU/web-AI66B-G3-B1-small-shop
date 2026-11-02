import os
import sys
from typing import Any, Dict

import bcrypt
from fastapi import HTTPException, status

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection


def hash_password(password: str) -> str:
    """Hash a plaintext password before storing it for account creation or updates."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def authenticate_user(username: str, password: str) -> Dict[str, Any]:
    """Authenticate an exact username/password pair and return non-sensitive user data."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id, username, password, role, is_active
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
            except ValueError:
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
        }
    finally:
        connection.close()
