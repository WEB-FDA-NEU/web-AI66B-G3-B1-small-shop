import os
import sys
from typing import Any, Dict, List

from fastapi import HTTPException, status

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection
from backend.schema.customer import CustomerCreate, CustomerUpdate


def search_customers(phone: str) -> List[Dict[str, Any]]:
    phone = phone.strip()
    if not phone:
        return []
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT customer_id, name, phone, email, customer_type_id
                FROM customers
                WHERE phone LIKE %s
                ORDER BY customer_id DESC
                LIMIT 20
            """, (f"%{phone}%",))
            return cursor.fetchall()
    finally:
        connection.close()


def get_customers() -> List[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT c.customer_id, c.name, c.phone, c.email, c.total_spent,
                       c.customer_type_id, ct.type_name, c.created_at
                FROM customers c
                LEFT JOIN customer_types ct ON ct.customer_type_id = c.customer_type_id
                ORDER BY c.customer_id DESC
            """)
            return cursor.fetchall()
    finally:
        connection.close()


def get_customer_types() -> List[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT customer_type_id, type_name, discount_percent
                FROM customer_types
                ORDER BY customer_type_id
            """)
            return cursor.fetchall()
    finally:
        connection.close()


def create_customer(data: CustomerCreate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT customer_id FROM customers WHERE phone = %s LIMIT 1",
                (data.phone.strip(),)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A customer with this phone number already exists."
                )
            cursor.execute("""
                INSERT INTO customers (name, phone, email, customer_type_id)
                VALUES (%s, %s, %s, %s)
            """, (
                data.name.strip(),
                data.phone.strip(),
                data.email,
                data.customer_type_id
            ))
            customer_id = cursor.lastrowid
            connection.commit()
            cursor.execute("""
                SELECT customer_id, name, phone, email, customer_type_id
                FROM customers
                WHERE customer_id = %s
            """, (customer_id,))
            return cursor.fetchone()
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")
    finally:
        connection.close()


def update_customer(customer_id: int, data: CustomerUpdate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT customer_id FROM customers WHERE customer_id = %s",
                (customer_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Customer not found.")

            cursor.execute(
                "SELECT customer_id FROM customers WHERE phone = %s AND customer_id != %s LIMIT 1",
                (data.phone.strip(), customer_id)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A customer with this phone number already exists."
                )

            cursor.execute("""
                UPDATE customers
                SET name = %s, phone = %s, email = %s, customer_type_id = %s
                WHERE customer_id = %s
            """, (
                data.name.strip(),
                data.phone.strip(),
                data.email.strip() if data.email else None,
                data.customer_type_id,
                customer_id
            ))
            connection.commit()
            cursor.execute("""
                SELECT c.customer_id, c.name, c.phone, c.email, c.total_spent,
                       c.customer_type_id, ct.type_name, c.created_at
                FROM customers c
                LEFT JOIN customer_types ct ON ct.customer_type_id = c.customer_type_id
                WHERE c.customer_id = %s
            """, (customer_id,))
            return cursor.fetchone()
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")
    finally:
        connection.close()


def delete_customer(customer_id: int) -> None:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT customer_id FROM customers WHERE customer_id = %s",
                (customer_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Customer not found.")

            cursor.execute(
                "SELECT order_id FROM orders WHERE customer_id = %s LIMIT 1",
                (customer_id,)
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This customer has orders and cannot be deleted."
                )

            cursor.execute("DELETE FROM customers WHERE customer_id = %s", (customer_id,))
            connection.commit()
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete customer: {str(e)}")
    finally:
        connection.close()
