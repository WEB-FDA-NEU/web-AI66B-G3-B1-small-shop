import os
import sys
from typing import Optional, List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database.connect_db import get_connection
from schema.inventory import InventoryCreate, InventoryUpdate

LOW_STOCK_THRESHOLD = 5      # <= ngưỡng này là 'Low Stock'
SHELF_LIFE_DAYS = 7          # hạn dùng mặc định của lô hàng mới nhập

# Điều kiện một lô hàng còn dùng được (chưa hết hạn)
NOT_EXPIRED = "(i.expiry_date IS NULL OR i.expiry_date >= CURDATE())"


def _inventory_select(where: str = "") -> str:
    """Câu SELECT dùng chung cho danh sách / thêm / sửa (tránh lặp lại 3 lần)."""
    return f"""
        SELECT
            t.*,
            CASE
                WHEN t.stock_quantity > 0 AND t.valid_quantity = 0 THEN 'Expired'
                WHEN t.valid_quantity <= {LOW_STOCK_THRESHOLD} THEN 'Low Stock'
                ELSE 'In Stock'
            END AS status,
            CASE
                WHEN t.stock_quantity > 0 AND t.valid_quantity = 0 THEN 'badge-expired'
                WHEN t.valid_quantity <= {LOW_STOCK_THRESHOLD} THEN 'badge-expired'
                ELSE 'badge-instock'
            END AS badge_class,
            CONCAT('P-', LPAD(t.product_id, 3, '0')) AS sku
        FROM (
            SELECT
                p.product_id,
                p.name AS product_name,
                p.category_id,
                COALESCE(c.category_name, 'General') AS category_name,
                COALESCE(c.category_name, 'General') AS category,
                p.unit_price,
                p.is_available,
                COALESCE(SUM(i.quantity), 0) AS stock_quantity,
                COALESCE(SUM(CASE WHEN {NOT_EXPIRED} THEN i.quantity ELSE 0 END), 0) AS valid_quantity,
                MAX(i.stocked_at) AS import_date
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN inventory i ON p.product_id = i.product_id
            {where}
            GROUP BY p.product_id, p.name, p.category_id, c.category_name, p.unit_price, p.is_available
        ) t
    """


def _sync_availability(cursor, product_id: Optional[int] = None) -> None:
    """Đồng bộ products.is_available:
    FALSE nếu hết hàng hoặc toàn bộ hàng đã hết hạn, ngược lại TRUE."""
    sql = f"""
        UPDATE products p
        SET p.is_available = EXISTS (
            SELECT 1 FROM inventory i
            WHERE i.product_id = p.product_id
              AND i.quantity > 0
              AND {NOT_EXPIRED}
        )
    """
    if product_id is not None:
        cursor.execute(sql + " WHERE p.product_id = %s", (product_id,))
    else:
        cursor.execute(sql)


def get_all_inventory() -> List[Dict[str, Any]]:
    """Lấy danh sách tồn kho, sắp xếp theo product_id tăng dần.
    Trạng thái: 'In Stock', 'Low Stock', 'Expired' (tính trên hàng còn hạn)."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # Hàng có thể hết hạn theo thời gian, nên đồng bộ is_available mỗi lần tải
            _sync_availability(cursor)
            cursor.execute(_inventory_select() + " ORDER BY t.product_id ASC")
            return cursor.fetchall() or []
    finally:
        connection.close()


def add_inventory(item_data: InventoryCreate) -> Dict[str, Any]:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO products (name, category_id, unit_price, is_available) VALUES (%s, %s, %s, %s)",
                (item_data.product_name, item_data.category_id, item_data.unit_price, item_data.stock_quantity > 0)
            )
            product_id = cursor.lastrowid

            initial_status = 'Low Stock' if item_data.stock_quantity <= LOW_STOCK_THRESHOLD else 'In Stock'
            cursor.execute(
                "INSERT INTO inventory (product_id, quantity, stocked_at, expiry_date, status) "
                "VALUES (%s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL %s DAY), %s)",
                (product_id, item_data.stock_quantity, SHELF_LIFE_DAYS, initial_status)
            )

            _sync_availability(cursor, product_id)
            cursor.execute(_inventory_select("WHERE p.product_id = %s"), (product_id,))
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

            # Chỉ chỉnh lô mới nhất để TỔNG tồn kho bằng số người dùng nhập
            # (trước đây UPDATE cho mọi lô cùng một số nên tổng bị nhân lên khi có nhiều lô)
            cursor.execute(
                "SELECT inventory_id, quantity FROM inventory WHERE product_id = %s "
                "ORDER BY stocked_at DESC, inventory_id DESC",
                (product_id,)
            )
            batches = cursor.fetchall() or []
            desired = int(item_data.stock_quantity)

            if not batches:
                cursor.execute(
                    "INSERT INTO inventory (product_id, quantity, stocked_at, expiry_date, status) "
                    "VALUES (%s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL %s DAY), %s)",
                    (product_id, desired, SHELF_LIFE_DAYS,
                     'Low Stock' if desired <= LOW_STOCK_THRESHOLD else 'In Stock')
                )
            else:
                latest = batches[0]
                others = sum(int(b["quantity"]) for b in batches[1:])
                new_latest_qty = max(0, desired - others)
                cursor.execute(
                    "UPDATE inventory SET quantity = %s WHERE inventory_id = %s",
                    (new_latest_qty, latest["inventory_id"])
                )

            _sync_availability(cursor, product_id)
            cursor.execute(_inventory_select("WHERE p.product_id = %s"), (product_id,))
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
        connection.close()s