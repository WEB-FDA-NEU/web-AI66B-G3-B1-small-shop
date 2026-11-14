import os
import sys
from typing import Optional, List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database.connect_db import get_connection
from schema.inventory import InventoryCreate, InventoryUpdate

def get_all_inventory() -> List[Dict[str, Any]]:
    """
    Lấy danh sách tồn kho, sắp xếp theo product_id tăng dần và chuẩn hóa 3 trạng thái:
    'In Stock', 'Low Stock', 'Expired/Disposal'.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT 
                    p.product_id,
                    p.name AS product_name,
                    p.category_id,
                    COALESCE(c.category_name, 'General') AS category_name,
                    COALESCE(c.category_name, 'General') AS category,
                    p.unit_price,
                    COALESCE(SUM(i.quantity), 0) AS stock_quantity,
                    COALESCE(MAX(i.stocked_at), '2026-11-01') AS import_date,
                    -- Chuẩn hóa đúng 3 trạng thái
                    CASE 
                        WHEN MAX(i.expiry_date) IS NOT NULL AND MAX(i.expiry_date) < CURDATE() THEN 'Expired/Disposal'
                        WHEN COALESCE(SUM(i.quantity), 0) <= 5 THEN 'Low Stock'
                        ELSE 'In Stock'
                    END AS status,
                    CASE 
                        WHEN MAX(i.expiry_date) IS NOT NULL AND MAX(i.expiry_date) < CURDATE() THEN 'badge-expired'
                        WHEN COALESCE(SUM(i.quantity), 0) <= 5 THEN 'badge-expired'
                        ELSE 'badge-instock'
                    END AS badge_class,
                    CONCAT('P-', LPAD(p.product_id, 3, '0')) AS sku
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN inventory i ON p.product_id = i.product_id
                GROUP BY p.product_id, p.name, p.category_id, c.category_name, p.unit_price
                ORDER BY p.product_id ASC;
            """
            cursor.execute(query)
            return cursor.fetchall() or []
    finally:
        connection.close()

def add_inventory(item_data: InventoryCreate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO products (name, category_id, unit_price, is_available) VALUES (%s, %s, %s, %s)",
                (item_data.product_name, item_data.category_id, item_data.unit_price, True)
            )
            product_id = cursor.lastrowid
            
            initial_status = 'Low Stock' if item_data.stock_quantity <= 5 else 'In Stock'
            cursor.execute(
                "INSERT INTO inventory (product_id, quantity, stocked_at, expiry_date, status) VALUES (%s, %s, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), %s)",
                (product_id, item_data.stock_quantity, initial_status)
            )

            cursor.execute("""
                SELECT p.product_id, p.name AS product_name, p.category_id, 
                       COALESCE(c.category_name, 'General') AS category_name,
                       COALESCE(c.category_name, 'General') AS category,
                       p.unit_price, COALESCE(SUM(i.quantity), 0) AS stock_quantity, 
                       COALESCE(MAX(i.stocked_at), '2026-11-01') AS import_date,
                       CASE 
                           WHEN MAX(i.expiry_date) IS NOT NULL AND MAX(i.expiry_date) < CURDATE() THEN 'Expired/Disposal'
                           WHEN COALESCE(SUM(i.quantity), 0) <= 5 THEN 'Low Stock'
                           ELSE 'In Stock'
                       END AS status, 
                       CASE 
                           WHEN MAX(i.expiry_date) IS NOT NULL AND MAX(i.expiry_date) < CURDATE() THEN 'badge-expired'
                           WHEN COALESCE(SUM(i.quantity), 0) <= 5 THEN 'badge-expired'
                           ELSE 'badge-instock'
                       END AS badge_class,
                       CONCAT('P-', LPAD(p.product_id, 3, '0')) AS sku
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN inventory i ON p.product_id = i.product_id
                WHERE p.product_id = %s
                GROUP BY p.product_id, p.name, p.category_id, c.category_name, p.unit_price
            """, (product_id,))
            return cursor.fetchone()
    finally:
        connection.close()

def update_inventory(sku: str, item_data: InventoryUpdate) -> Optional[Dict[str, Any]]:
    connection = get_connection()
    try:
        product_id = int(sku.replace("P-", ""))
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE products SET name = %s, unit_price = %s WHERE product_id = %s",
                (item_data.product_name, item_data.unit_price, product_id)
            )
            cursor.execute(
                "UPDATE inventory SET quantity = %s WHERE product_id = %s",
                (item_data.stock_quantity, product_id)
            )
            cursor.execute("""
                SELECT p.product_id, p.name AS product_name, p.category_id, 
                       COALESCE(c.category_name, 'General') AS category_name,
                       COALESCE(c.category_name, 'General') AS category,
                       p.unit_price, COALESCE(SUM(i.quantity), 0) AS stock_quantity, 
                       COALESCE(MAX(i.stocked_at), '2026-11-01') AS import_date,
                       CASE 
                           WHEN MAX(i.expiry_date) IS NOT NULL AND MAX(i.expiry_date) < CURDATE() THEN 'Expired/Disposal'
                           WHEN COALESCE(SUM(i.quantity), 0) <= 5 THEN 'Low Stock'
                           ELSE 'In Stock'
                       END AS status, 
                       CASE 
                           WHEN MAX(i.expiry_date) IS NOT NULL AND MAX(i.expiry_date) < CURDATE() THEN 'badge-expired'
                           WHEN COALESCE(SUM(i.quantity), 0) <= 5 THEN 'badge-expired'
                           ELSE 'badge-instock'
                       END AS badge_class,
                       CONCAT('P-', LPAD(p.product_id, 3, '0')) AS sku
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN inventory i ON p.product_id = i.product_id
                WHERE p.product_id = %s
                GROUP BY p.product_id, p.name, p.category_id, c.category_name, p.unit_price
            """, (product_id,))
            return cursor.fetchone()
    finally:
        connection.close()

def delete_inventory(sku: str) -> bool:
    connection = get_connection()
    try:
        product_id = int(sku.replace("P-", ""))
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM inventory WHERE product_id = %s;", (product_id,))
            cursor.execute("DELETE FROM products WHERE product_id = %s;", (product_id,))
            return cursor.rowcount > 0
    finally:
        connection.close()