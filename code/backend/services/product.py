import os
import sys
from typing import Optional, List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection
from backend.schema.product import ProductCreate, ProductUpdate

def get_all_products() -> List[Dict[str, Any]]:
    """Lấy danh sách tất cả sản phẩm kèm tên danh mục."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT p.product_id, p.name, p.category_id, c.category_name, p.unit_price, p.is_available
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                ORDER BY p.product_id DESC;
            """
            cursor.execute(query)
            return cursor.fetchall() or []
    finally:
        connection.close()

def add_product(product_data: ProductCreate) -> Dict[str, Any]:
    """Thêm sản phẩm mới vào cơ sở dữ liệu."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                INSERT INTO products (name, category_id, unit_price, is_available)
                VALUES (%s, %s, %s, %s);
            """
            cursor.execute(query, (
                product_data.name,
                product_data.category_id,
                product_data.unit_price,
                product_data.is_available
            ))
            product_id = cursor.lastrowid

            cursor.execute("""
                SELECT p.product_id, p.name, p.category_id, c.category_name, p.unit_price, p.is_available
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                WHERE p.product_id = %s;
            """, (product_id,))
            return cursor.fetchone()
    finally:
        connection.close()

def update_product(product_id: int, product_data: ProductUpdate) -> Optional[Dict[str, Any]]:
    """Cập nhật thông tin sản phẩm."""
    update_data = product_data.model_dump(exclude_unset=True)
    if not update_data:
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM products WHERE product_id = %s;", (product_id,))
                return cursor.fetchone()
        finally:
            connection.close()

    set_clause = ", ".join([f"`{key}` = %s" for key in update_data.keys()])
    values = list(update_data.values()) + [product_id]

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"UPDATE products SET {set_clause} WHERE product_id = %s;", values)
            if cursor.rowcount == 0:
                cursor.execute("SELECT 1 FROM products WHERE product_id = %s;", (product_id,))
                if not cursor.fetchone():
                    return None

            cursor.execute("""
                SELECT p.product_id, p.name, p.category_id, c.category_name, p.unit_price, p.is_available
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                WHERE p.product_id = %s;
            """, (product_id,))
            return cursor.fetchone()
    finally:
        connection.close()

def delete_product(product_id: int) -> bool:
    """Xóa sản phẩm theo ID."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM products WHERE product_id = %s;", (product_id,))
            return cursor.rowcount > 0
    finally:
        connection.close()