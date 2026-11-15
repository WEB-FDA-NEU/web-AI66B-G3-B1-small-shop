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
            #"access_token": _create_session(user["user_id"]),
        }
    finally:
        connection.close()

def create_password_reset_request(username: str) -> None:
    """Creates or updates a pending password reset request for a given username."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_id FROM users WHERE username = %s AND is_active = TRUE",
                (username,)
            )
            user = cursor.fetchone()
            if not user:
                # Useful for development/debugging logs
                print(f"[DEBUG] Password reset requested for non-existent or inactive user: {username}")
                return

            user_id = user["user_id"]

            cursor.execute(
                """
                INSERT INTO password_reset_requests (user_id, status)
                VALUES (%s, 'pending')
                ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP, status = 'pending'
                """,
                (user_id,),
            )
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def get_password_reset_requests() -> list:
    """Retrieves all pending password reset requests with user details."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.request_id, r.user_id, u.username, r.created_at, r.status
                FROM password_reset_requests r
                JOIN users u ON r.user_id = u.user_id
                WHERE r.status = 'pending'
                ORDER BY r.created_at DESC
                """
            )
            return cursor.fetchall()
    finally:
        connection.close()


def approve_password_reset(user_id: int) -> str:
    """
    Approves a password reset request:
    - Generates a temporary password.
    - Updates the user's password and forces `must_change_password = TRUE`.
    - Marks the reset request as 'approved'.
    """
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            # Verify user exists
            cursor.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found."
                )

            # Generate a secure temporary password
            temp_password = secrets.token_urlsafe(8) + "A1!"
            hashed_password = hash_password(temp_password)

            # Update user credentials and force password change on next login
            cursor.execute(
                """
                UPDATE users
                SET password = %s, must_change_password = TRUE
                WHERE user_id = %s
                """,
                (hashed_password, user_id),
            )

            # Mark request as approved (or delete it if you prefer)
            cursor.execute(
                """
                UPDATE password_reset_requests
                SET status = 'approved'
                WHERE user_id = %s AND status = 'pending'
                """,
                (user_id,),
            )
            
            connection.commit()
            return temp_password # Optional: Return if managers need to view/copy the temp password
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
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