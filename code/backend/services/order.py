import os
import sys
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection
from backend.schema.order import OrderCreate, OrderNoteUpdate

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

def get_order_by_id(order_id: int) -> Optional[Dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT o.order_id, o.employee_id, o.customer_id,
                       o.deliver_status, o.total_amount, o.discount_amount,
                       o.note,
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


def _stock_validation_error(
    product_name: str,
    required_quantity: int,
    stock_rows: List[Dict[str, Any]],
) -> Optional[str]:
    usable_rows = [row for row in stock_rows if row["is_usable"]]
    usable_quantity = sum(int(row["quantity"]) for row in usable_rows)
    if usable_quantity == 0:
        if stock_rows:
            return f"{product_name} is expired and cannot be ordered."
        return f"{product_name} is out of stock."
    if usable_quantity < required_quantity:
        return (
            f"Not enough non-expired stock for {product_name}. "
            f"Only {usable_quantity} available."
        )
    if max(int(row["quantity"]) for row in usable_rows) < required_quantity:
        return (
            f"No single non-expired inventory batch has enough stock for "
            f"{product_name} ({required_quantity} required)."
        )
    return None


def _stock_deduction_error(
    product_name: str,
    required_quantity: int,
    usable_before: int,
    usable_after: int,
) -> Optional[str]:
    if usable_before - usable_after == required_quantity:
        return None
    return (
        f"Could not deduct {required_quantity} units of non-expired stock "
        f"for {product_name}. The order was cancelled; refresh stock and try again."
    )


#create new order
def create_order(data: OrderCreate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        connection.begin()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT employee_id
                FROM employees
                WHERE username = %s AND status = 'Active'
                """,
                (data.username.strip(),)
            )
            employee = cursor.fetchone()
            if not employee:
                raise HTTPException(
                    status_code=400,
                    detail="Employee does not exist or is not active."
                )
            employee_id = employee["employee_id"]

            if data.customer_id is not None:
                cursor.execute(
                    "SELECT customer_id FROM customers WHERE customer_id = %s",
                    (data.customer_id,)
                )
                if not cursor.fetchone():
                    raise HTTPException(status_code=400, detail="Customer not found.")

            required_quantities = {}
            for item in data.items:
                required_quantities[item.product_id] = (
                    required_quantities.get(item.product_id, 0) + item.quantity
                )

            products = {}
            usable_stock_by_product = {}
            for product_id, required_quantity in required_quantities.items():
                cursor.execute("""
                    SELECT product_id, name, unit_price, is_available
                    FROM products
                    WHERE product_id = %s
                """, (product_id,))
                product = cursor.fetchone()
                if not product:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product {product_id} does not exist."
                    )

                cursor.execute("""
                    SELECT quantity,
                           (
                               status <> 'Expired'
                               AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
                           ) AS is_usable
                    FROM inventory
                    WHERE product_id = %s AND quantity > 0
                    ORDER BY expiry_date IS NULL, expiry_date, stocked_at, inventory_id
                    FOR UPDATE
                """, (product_id,))
                stock_rows = cursor.fetchall() or []
                stock_error = _stock_validation_error(
                    product["name"],
                    required_quantity,
                    stock_rows,
                )
                if stock_error:
                    raise HTTPException(status_code=409, detail=stock_error)
                if not product["is_available"]:
                    raise HTTPException(
                        status_code=409,
                        detail=f"{product['name']} is currently unavailable.",
                    )

                products[product_id] = product
                usable_stock_by_product[product_id] = sum(
                    int(row["quantity"])
                    for row in stock_rows
                    if row["is_usable"]
                )

            total = Decimal("0.00")
            prepared_items = []
            for item in data.items:
                product = products[item.product_id]
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
                    (employee_id, customer_id, note, deliver_status, total_amount, discount_amount)
                VALUES (%s, %s, %s, 'not_deliver', %s, 0)
            """, (
                employee_id,
                data.customer_id,
                data.note.strip() or None if data.note is not None else None,
                total
            ))
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

                cursor.execute("""
                    SELECT COALESCE(SUM(quantity), 0) AS usable_quantity
                    FROM inventory
                    WHERE product_id = %s
                      AND quantity > 0
                      AND status <> 'Expired'
                      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
                """, (item["product_id"],))
                usable_after = int(cursor.fetchone()["usable_quantity"])
                stock_error = _stock_deduction_error(
                    products[item["product_id"]]["name"],
                    item["quantity"],
                    usable_stock_by_product[item["product_id"]],
                    usable_after,
                )
                if stock_error:
                    raise HTTPException(status_code=409, detail=stock_error)
                usable_stock_by_product[item["product_id"]] = usable_after

        connection.commit()
        return get_order_by_id(order_id)
    except HTTPException:
        connection.rollback()
        raise
    except Exception as e:
        connection.rollback()
        if getattr(e, "args", ()) and e.args[0] == 1644:
            raise HTTPException(
                status_code=409,
                detail="A product is no longer available or has insufficient stock. Refresh the menu and try again.",
            ) from e
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")
    finally:
        connection.close()


#update note of an existing order
def update_order_note(
    order_id: int,
    data: OrderNoteUpdate
) -> Dict[str, Any]:
    connection = get_connection()

    try:
        connection.begin()

        with connection.cursor() as cursor:
            # Lock the order row while checking and updating
            cursor.execute("""
                SELECT order_id, deliver_status
                FROM orders
                WHERE order_id = %s
                FOR UPDATE
            """, (order_id,))

            order = cursor.fetchone()

            if not order:
                raise HTTPException(
                    status_code=404,
                    detail="Order not found."
                )

            if order["deliver_status"] != "not_deliver":
                raise HTTPException(
                    status_code=409,
                    detail="Cannot update note of a delivered order."
                )

            note = data.note.strip() if data.note is not None else None

            cursor.execute("""
                UPDATE orders
                SET note = %s
                WHERE order_id = %s
            """, (note or None, order_id))

        connection.commit()

        return get_order_by_id(order_id)

    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update order note: {str(e)}"
        )

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