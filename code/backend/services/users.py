from typing import Any, Dict, List

import pymysql
from fastapi import HTTPException, status

from backend.database.connect_db import get_connection
from backend.schema.user import UserCreate, UserUpdate
from backend.services.auth import hash_password, revoke_user_sessions

DEFAULT_PASSWORD = "password123"
PRIVILEGED_ROLES = {"Admin", "Manager"}


def _get_user(cursor: Any, user_id: int, for_update: bool = False) -> Dict[str, Any]:
    cursor.execute(
        """
        SELECT u.user_id, u.username, u.role, u.is_active, u.created_at,
               EXISTS (
                   SELECT 1 FROM password_reset_requests r
                   WHERE r.user_id = u.user_id
               ) AS reset_requested
        FROM users u
        WHERE u.user_id = %s
        """ + (" FOR UPDATE" if for_update else ""),
        (user_id,),
    )
    user = cursor.fetchone()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return user


def _lock_privileged_users(cursor: Any) -> int:
    cursor.execute(
        "SELECT user_id FROM users WHERE role IN ('Admin', 'Manager') FOR UPDATE"
    )
    return len(cursor.fetchall())


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
            user_id = cursor.lastrowid
            connection.commit()
            return _get_user(cursor, user_id)
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


def update_user(user_id: int, data: UserUpdate, actor: Dict[str, Any]) -> Dict[str, Any]:
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            current_user = _get_user(cursor, user_id, for_update=True)
            if data.role == "Admin" and current_user["role"] != "Admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only an existing administrator can retain the Admin role.",
                )
            if int(actor["user_id"]) == user_id and data.role not in PRIVILEGED_ROLES:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You cannot remove your own user-management access.",
                )
            if (
                current_user["role"] in PRIVILEGED_ROLES
                and data.role not in PRIVILEGED_ROLES
                and _lock_privileged_users(cursor) <= 1
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The last administrator or manager cannot be demoted.",
                )

            cursor.execute(
                """
                UPDATE users
                SET username = %s, role = %s
                WHERE user_id = %s
                """,
                (data.username, data.role, user_id),
            )
            connection.commit()
            return _get_user(cursor, user_id)
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
            _get_user(cursor, user_id)
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
    revoke_user_sessions(user_id)


def delete_user(user_id: int, actor: Dict[str, Any]) -> None:
    if int(actor["user_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot delete the account you are currently using.",
        )

    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            user = _get_user(cursor, user_id, for_update=True)
            if (
                user["role"] in PRIVILEGED_ROLES
                and _lock_privileged_users(cursor) <= 1
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The last administrator or manager cannot be deleted.",
                )
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
    revoke_user_sessions(user_id)


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
    revoke_user_sessions(user_id)
