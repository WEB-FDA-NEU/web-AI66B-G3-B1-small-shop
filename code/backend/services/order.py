
import os
import sys
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection
from backend.schema.order import OrderCreate, CustomerCreate

#get all products from the products db table
def get_products() -> List[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT product_id, name, category_id, unit_price, is_available
                FROM products
                WHERE is_available = TRUE
                ORDER BY product_id
            """)
            return cursor.fetchall()
    finally:
        connection.close()

#get the customer w that phone num
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

#create new customer as they like to
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

def get_order_by_id(order_id: int) -> Optional[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT o.order_id, o.employee_id, o.customer_id,
                       o.deliver_status, o.total_amount, o.discount_amount,
                       o.created_at,
                       c.name AS customer_name, c.phone AS customer_phone,
                       e.name AS employee_name
                FROM orders o
                LEFT JOIN customers c ON c.customer_id = o.customer_id
                LEFT JOIN employees e ON e.employee_id = o.employee_id
                WHERE o.order_id = %s
            """, (order_id,))
            order = cursor.fetchone()
            if not order:
                return None
            cursor.execute("""
                SELECT oi.order_item_id, oi.product_id, p.name,
                       oi.quantity, oi.unit_price, oi.subtotal
                FROM order_items oi
                JOIN products p ON p.product_id = oi.product_id
                WHERE oi.order_id = %s
                ORDER BY oi.order_item_id
            """, (order_id,))
            order["items"] = cursor.fetchall()
            return order
    finally:
        connection.close()

def get_orders() -> List[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT o.order_id, o.employee_id, o.customer_id,
                       o.deliver_status, o.total_amount, o.discount_amount,
                       o.created_at,
                       c.name AS customer_name, c.phone AS customer_phone,
                       e.name AS employee_name,
                       COUNT(oi.order_item_id) AS item_count
                FROM orders o
                LEFT JOIN customers c ON c.customer_id = o.customer_id
                LEFT JOIN employees e ON e.employee_id = o.employee_id
                LEFT JOIN order_items oi ON oi.order_id = o.order_id
                GROUP BY o.order_id, o.employee_id, o.customer_id,
                         o.deliver_status, o.total_amount, o.discount_amount,
                         o.created_at, c.name, c.phone, e.name
                ORDER BY o.order_id DESC
            """)
            return cursor.fetchall()
    finally:
        connection.close()

#create new order
def create_order(data: OrderCreate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT employee_id FROM employees WHERE employee_id = %s AND status = 'Active'",
                (data.employee_id,)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Employee does not exist or is not active.")

            if data.customer_id is not None:
                cursor.execute(
                    "SELECT customer_id FROM customers WHERE customer_id = %s",
                    (data.customer_id,)
                )
                if not cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Customer not found.")

            total = Decimal("0.00")
            prepared_items = []
            for item in data.items:
                cursor.execute("""
                    SELECT product_id, name, unit_price
                    FROM products
                    WHERE product_id = %s AND is_available = TRUE
                """, (item.product_id,))
                product = cursor.fetchone()
                if not product:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product {item.product_id} does not exist or is unavailable."
                    )
                unit_price = Decimal(str(product["unit_price"]))
                subtotal = unit_price * item.quantity
                total += subtotal
                prepared_items.append({
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                    "subtotal": subtotal
                })

            cursor.execute("""
                INSERT INTO orders
                    (employee_id, customer_id, deliver_status, total_amount, discount_amount)
                VALUES (%s, %s, 'not_deliver', %s, 0)
            """, (data.employee_id, data.customer_id, total))
            order_id = cursor.lastrowid

            for item in prepared_items:
                cursor.execute("""
                    INSERT INTO order_items
                        (order_id, product_id, quantity, unit_price, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    order_id,
                    item["product_id"],
                    item["quantity"],
                    item["unit_price"],
                    item["subtotal"]
                ))

        connection.commit()
        return get_order_by_id(order_id)
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")
    finally:
        connection.close()

#switch an order into delivered
def mark_order_delivered(order_id: int) -> Dict[str, Any]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT order_id, deliver_status FROM orders WHERE order_id = %s",
                (order_id,)
            )
            order = cursor.fetchone()
            if not order:
                raise HTTPException(status_code=404, detail="Order not found.")
            if order["deliver_status"] != "delivered":
                cursor.execute(
                    "UPDATE orders SET deliver_status = 'delivered' WHERE order_id = %s",
                    (order_id,)
                )
                connection.commit()
        updated_order = get_order_by_id(order_id)
        return {
            "order_id": updated_order["order_id"],
            "created_at": updated_order["created_at"],
            "deliver_status": updated_order["deliver_status"]
        }
    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update delivery status: {str(e)}")
    finally:
        connection.close()