from typing import Any, Dict, List

import pymysql
from fastapi import HTTPException, status

from backend.database.connect_db import get_connection
from backend.schema.user import UserCreate, UserUpdate
from backend.services.auth import hash_password

DEFAULT_PASSWORD = "password123"
PRIVILEGED_ROLES = {"Admin", "Manager"}

def get_users() -> List[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.user_id, u.username, u.role, u.is_active, u.created_at,
                       EXISTS (
                           SELECT 1 FROM password_reset_requests r
                           WHERE r.user_id = u.user_id
                       ) AS reset_requested
                FROM users u
                ORDER BY u.user_id
                """
            )
            return cursor.fetchall()
    finally:
        connection.close()


def create_user(data: UserCreate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, password, role, must_change_password)
                VALUES (%s, %s, %s, TRUE)
                """,
                (data.username, hash_password(DEFAULT_PASSWORD), data.role),
            )

            connection.commit()
            user_id = cursor.lastrowid

            cursor.execute("SELECT * FROM users WHERE user_id = %s;", (user_id,))
            new_user = cursor.fetchone()
            return new_user
    except pymysql.err.IntegrityError as error:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this username already exists.",
        ) from error
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def update_user(user_id: int, data: UserUpdate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET username = %s, role = %s
                WHERE user_id = %s
                """,
                (data.username, data.role, user_id),
            )
            connection.commit()            
            cursor.execute("SELECT * FROM users WHERE user_id = %s;", (user_id,))
            updated_user = cursor.fetchone()
            if not updated_user:
                raise HTTPException(status_code=404, detail="User not found")
            return updated_user
    except HTTPException:
        connection.rollback()
        raise
    except pymysql.err.IntegrityError as error:
        connection.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this username already exists.",
        ) from error
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def reset_user_password(user_id: int) -> None:
    password_hash = hash_password(DEFAULT_PASSWORD)
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET password = %s, must_change_password = TRUE
                WHERE user_id = %s
                """,
                (password_hash, user_id),
            )
            cursor.execute(
                "DELETE FROM password_reset_requests WHERE user_id = %s",
                (user_id,),
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

def delete_user(user_id: int) -> None:
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        connection.commit()
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def create_password_reset_request(username: str) -> None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO password_reset_requests (user_id)
                SELECT user_id
                FROM users
                WHERE BINARY username = BINARY %s AND is_active = TRUE
                ON DUPLICATE KEY UPDATE requested_at = CURRENT_TIMESTAMP
                """,
                (username.strip(),),
            )
            connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def get_password_reset_requests() -> List[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.user_id, u.username, u.role, r.requested_at
                FROM password_reset_requests r
                JOIN users u ON u.user_id = r.user_id
                WHERE u.is_active = TRUE
                ORDER BY r.requested_at, r.user_id
                """
            )
            return cursor.fetchall()
    finally:
        connection.close()


def approve_password_reset(user_id: int) -> None:
    password_hash = hash_password(DEFAULT_PASSWORD)
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id FROM password_reset_requests
                WHERE user_id = %s FOR UPDATE
                """,
                (user_id,),
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Password reset request not found.",
                )

            cursor.execute(
                "SELECT user_id FROM users WHERE user_id = %s AND is_active = TRUE FOR UPDATE",
                (user_id,),
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found.",
                )

            cursor.execute(
                """
                UPDATE users
                SET password = %s, must_change_password = TRUE
                WHERE user_id = %s
                """,
                (password_hash, user_id),
            )
            cursor.execute(
                "DELETE FROM password_reset_requests WHERE user_id = %s",
                (user_id,),
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