import os
import sys
from typing import Optional, List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database.connect_db import get_connection
from schema.inventory import InventoryCreate, InventoryUpdate

LOW_STOCK_THRESHOLD = 5      # tồn kho còn hạn <= ngưỡng này là 'Low Stock'
NEAR_EXPIRY_DAYS = 2         # có lô hết hạn trong vòng N ngày tới là 'Near Expiration'
SHELF_LIFE_DAYS = 7          # hạn dùng mặc định của lô hàng mới nhập

# Điều kiện một lô hàng còn dùng được (chưa hết hạn)
NOT_EXPIRED = "(i.expiry_date IS NULL OR i.expiry_date >= CURDATE())"


def _inventory_select(where: str = "") -> str:
    """Câu SELECT dùng chung cho danh sách / thêm / sửa (tránh lặp lại 3 lần)."""
    return f"""
        SELECT
            t.*,
            -- 5 trạng thái: Sold out > Expired > Low Stock > Near Expiration > Available
            CASE
                WHEN t.stock_quantity = 0 AND t.expired_quantity = 0 THEN 'Sold out'
                WHEN t.stock_quantity = 0 THEN 'Expired'
                WHEN t.stock_quantity <= {LOW_STOCK_THRESHOLD} THEN 'Low Stock'
                WHEN t.near_expiry_quantity > 0 THEN 'Near Expiration'
                ELSE 'Available'
            END AS status,
            CASE
                WHEN t.stock_quantity = 0 AND t.expired_quantity = 0 THEN 'badge-soldout'
                WHEN t.stock_quantity = 0 THEN 'badge-expired'
                WHEN t.stock_quantity <= {LOW_STOCK_THRESHOLD} THEN 'badge-lowstock'
                WHEN t.near_expiry_quantity > 0 THEN 'badge-nearexp'
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
                -- stock_quantity: CHỈ tính hàng còn hạn (có thể bán)
                COALESCE(SUM(CASE WHEN {NOT_EXPIRED} THEN i.quantity ELSE 0 END), 0) AS stock_quantity,
                -- expired_quantity: hàng đã hết hạn, cần hủy (không cộng vào tồn kho)
                COALESCE(SUM(CASE WHEN i.expiry_date < CURDATE() THEN i.quantity ELSE 0 END), 0) AS expired_quantity,
                -- near_expiry_quantity: hàng còn hạn nhưng sắp hết hạn
                COALESCE(SUM(CASE WHEN i.expiry_date >= CURDATE()
                                   AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL {NEAR_EXPIRY_DAYS} DAY)
                                  THEN i.quantity ELSE 0 END), 0) AS near_expiry_quantity,
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
    Trạng thái: Available, Low Stock, Near Expiration, Expired, Sold out."""
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

            cursor.execute(
                "INSERT INTO inventory (product_id, quantity, stocked_at, expiry_date, status) "
                "VALUES (%s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL %s DAY), %s)",
                (product_id, item_data.stock_quantity, SHELF_LIFE_DAYS, 'Available')
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

            # Số lượng người dùng nhập = số lượng CÒN HẠN (có thể bán).
            # Chỉ điều chỉnh các lô còn hạn, không đụng vào lô đã hết hạn.
            cursor.execute(
                f"SELECT inventory_id, quantity FROM inventory i WHERE i.product_id = %s AND {NOT_EXPIRED} "
                "ORDER BY i.stocked_at DESC, i.inventory_id DESC",
                (product_id,)
            )
            batches = cursor.fetchall() or []
            desired = int(item_data.stock_quantity)

            if not batches:
                if desired > 0:
                    cursor.execute(
                        "INSERT INTO inventory (product_id, quantity, stocked_at, expiry_date, status) "
                        "VALUES (%s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL %s DAY), %s)",
                        (product_id, desired, SHELF_LIFE_DAYS, 'Available')
                    )
            else:
                latest = batches[0]
                others = sum(int(b["quantity"]) for b in batches[1:])
                cursor.execute(
                    "UPDATE inventory SET quantity = %s WHERE inventory_id = %s",
                    (max(0, desired - others), latest["inventory_id"])
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
        connection.close()