import os
import re
import sys
from typing import Optional, List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from database.connect_db import get_connection
from schema.inventory import InventoryCreate, InventoryUpdate

LOW_STOCK_THRESHOLD = 5      # lô có số lượng <= ngưỡng này là 'Low Stock'
NEAR_EXPIRY_DAYS = 2         # lô hết hạn trong vòng N ngày tới là 'Near Expiration'
SHELF_LIFE_DAYS = 7          # hạn dùng mặc định của lô hàng mới nhập

# Điều kiện một lô hàng còn dùng được (chưa hết hạn)
NOT_EXPIRED = "(i.expiry_date IS NULL OR i.expiry_date >= CURDATE())"


def _parse_inventory_id(code: str) -> int:
    """'INV-012' -> 12 (cũng chấp nhận '12')."""
    digits = re.sub(r"\D", "", str(code))
    if not digits:
        raise ValueError("Invalid inventory id")
    return int(digits)


def _batch_select(where: str = "") -> str:
    """Mỗi dòng = MỘT lô nhập kho (inventory record). Không gộp theo sản phẩm.
    Trạng thái tính riêng cho từng lô:
    Sold out > Expired > Low Stock > Near Expiration > Available."""
    return f"""
        SELECT
            t.*,
            CASE
                WHEN t.stock_quantity = 0 THEN 'Sold out'
                WHEN t.expiry_date IS NOT NULL AND t.expiry_date < CURDATE() THEN 'Expired'
                WHEN t.stock_quantity <= {LOW_STOCK_THRESHOLD} THEN 'Low Stock'
                WHEN t.expiry_date IS NOT NULL
                     AND t.expiry_date <= DATE_ADD(CURDATE(), INTERVAL {NEAR_EXPIRY_DAYS} DAY) THEN 'Near Expiration'
                ELSE 'Available'
            END AS status,
            CASE
                WHEN t.stock_quantity = 0 THEN 'badge-soldout'
                WHEN t.expiry_date IS NOT NULL AND t.expiry_date < CURDATE() THEN 'badge-expired'
                WHEN t.stock_quantity <= {LOW_STOCK_THRESHOLD} THEN 'badge-lowstock'
                WHEN t.expiry_date IS NOT NULL
                     AND t.expiry_date <= DATE_ADD(CURDATE(), INTERVAL {NEAR_EXPIRY_DAYS} DAY) THEN 'badge-nearexp'
                ELSE 'badge-instock'
            END AS badge_class
        FROM (
            SELECT
                i.inventory_id,
                CONCAT('INV-', LPAD(i.inventory_id, 3, '0')) AS inventory_code,
                p.product_id,
                CONCAT('P-', LPAD(p.product_id, 3, '0')) AS product_code,
                p.name AS product_name,
                p.category_id,
                COALESCE(c.category_name, 'General') AS category_name,
                COALESCE(c.category_name, 'General') AS category,
                p.unit_price,
                p.is_available,
                i.quantity AS stock_quantity,
                i.stocked_at AS import_date,
                i.expiry_date
            FROM inventory i
            JOIN products p ON p.product_id = i.product_id
            LEFT JOIN categories c ON c.category_id = p.category_id
            {where}
        ) t
    """


def _sync_batch_status(cursor) -> None:
    """Giữ cột inventory.status (Available / Near Expiration / Expired) đúng theo ngày hiện tại."""
    cursor.execute(f"""
        UPDATE inventory
        SET status = CASE
            WHEN expiry_date IS NULL THEN status
            WHEN expiry_date < CURDATE() THEN 'Expired'
            WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL {NEAR_EXPIRY_DAYS} DAY) THEN 'Near Expiration'
            ELSE 'Available'
        END
    """)


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
    """Lịch sử nhập kho: mỗi lô một dòng, mới nhập nhất xếp trước."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            _sync_batch_status(cursor)
            _sync_availability(cursor)
            cursor.execute(_batch_select() + " ORDER BY t.import_date DESC, t.inventory_id DESC")
            return cursor.fetchall() or []
    finally:
        connection.close()


def add_inventory(item_data: InventoryCreate) -> Dict[str, Any]:
    """Nhập hàng: luôn tạo MỘT lô mới (dòng mới trong inventory).
    Nếu sản phẩm (cùng tên + danh mục) đã tồn tại thì dùng lại sản phẩm đó, không tạo trùng."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT product_id FROM products WHERE LOWER(name) = LOWER(%s) AND category_id = %s LIMIT 1",
                (item_data.product_name.strip(), item_data.category_id)
            )
            existing = cursor.fetchone()

            if existing:
                product_id = existing["product_id"]
                cursor.execute(
                    "UPDATE products SET unit_price = %s WHERE product_id = %s",
                    (item_data.unit_price, product_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO products (name, category_id, unit_price, is_available) VALUES (%s, %s, %s, %s)",
                    (item_data.product_name.strip(), item_data.category_id, item_data.unit_price,
                     item_data.stock_quantity > 0)
                )
                product_id = cursor.lastrowid

            cursor.execute(
                "INSERT INTO inventory (product_id, quantity, stocked_at, expiry_date, status) "
                "VALUES (%s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL %s DAY), %s)",
                (product_id, item_data.stock_quantity, SHELF_LIFE_DAYS, 'Available')
            )
            inventory_id = cursor.lastrowid

            _sync_availability(cursor, product_id)
            cursor.execute(_batch_select("WHERE i.inventory_id = %s"), (inventory_id,))
            return cursor.fetchone()
    finally:
        connection.close()


def update_inventory(sku: str, item_data: InventoryUpdate) -> Optional[Dict[str, Any]]:
    """Sửa MỘT lô: số lượng chỉ áp dụng cho lô này.
    Tên và giá là thông tin của sản phẩm nên áp dụng cho mọi lô của sản phẩm đó.
    (Tham số 'sku' nay là mã lô, ví dụ 'INV-012'.)"""
    connection = get_connection()
    try:
        inventory_id = _parse_inventory_id(sku)
        with connection.cursor() as cursor:
            cursor.execute("SELECT product_id FROM inventory WHERE inventory_id = %s", (inventory_id,))
            row = cursor.fetchone()
            if not row:
                return None
            product_id = row["product_id"]

            # Trường nào không gửi lên (None) thì giữ nguyên giá trị cũ
            cursor.execute(
                "UPDATE products SET name = COALESCE(%s, name), unit_price = COALESCE(%s, unit_price), "
                "category_id = COALESCE(%s, category_id) WHERE product_id = %s",
                (item_data.product_name, item_data.unit_price, item_data.category_id, product_id)
            )

            if item_data.stock_quantity is not None:
                cursor.execute(
                    "UPDATE inventory SET quantity = %s WHERE inventory_id = %s",
                    (item_data.stock_quantity, inventory_id)
                )

            _sync_availability(cursor, product_id)
            cursor.execute(_batch_select("WHERE i.inventory_id = %s"), (inventory_id,))
            return cursor.fetchone()
    finally:
        connection.close()


def delete_inventory(sku: str) -> bool:
    """Xóa MỘT lô nhập kho. Sản phẩm vẫn được giữ lại (đơn hàng cũ còn tham chiếu tới nó)."""
    connection = get_connection()
    try:
        inventory_id = _parse_inventory_id(sku)
        with connection.cursor() as cursor:
            cursor.execute("SELECT product_id FROM inventory WHERE inventory_id = %s", (inventory_id,))
            row = cursor.fetchone()
            if not row:
                return False
            cursor.execute("DELETE FROM inventory WHERE inventory_id = %s", (inventory_id,))
            deleted = cursor.rowcount > 0
            _sync_availability(cursor, row["product_id"])
            return deleted
    finally:
        connection.close()