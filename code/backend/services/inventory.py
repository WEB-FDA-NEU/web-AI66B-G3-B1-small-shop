import os
import sys
from typing import Optional, List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection
from backend.schema.inventory import InventoryCreate, InventoryUpdate

def get_all_inventory() -> List[Dict[str, Any]]:
    """Retrieves all inventory products ordered by SKU ascending."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM inventory ORDER BY sku ASC;")
            products = cursor.fetchall()
            return products if products else []
    finally:
        connection.close()

def get_inventory_by_sku(sku: str) -> Optional[Dict[str, Any]]:
    """Helper to fetch an inventory item by SKU."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM inventory WHERE sku = %s;", (sku,))
            return cursor.fetchone()
    finally:
        connection.close()

def add_inventory(item_data: InventoryCreate) -> Dict[str, Any]:
    """Inserts a new product into inventory and returns the created record."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # Tự tạo SKU mới (P-001, P-002...) nếu không được truyền vào
            sku = item_data.sku
            if not sku:
                cursor.execute("SELECT COUNT(*) as count FROM inventory;")
                count_result = cursor.fetchone()
                total = count_result['count'] if count_result else 0
                sku = f"P-{str(total + 1).zfill(3)}"

            query = """
                INSERT INTO inventory (sku, name, category, price, stock, min_stock, image)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """
            cursor.execute(
                query,
                (
                    sku,
                    item_data.name,
                    item_data.category,
                    item_data.price,
                    item_data.stock,
                    item_data.min_stock,
                    item_data.image,
                ),
            )

            cursor.execute("SELECT * FROM inventory WHERE sku = %s;", (sku,))
            return cursor.fetchone()
    finally:
        connection.close()

def update_inventory(sku: str, item_data: InventoryUpdate) -> Optional[Dict[str, Any]]:
    """Updates non-null fields of an inventory product and returns the updated record."""
    update_data = item_data.model_dump(exclude_unset=True)
    if not update_data:
        return get_inventory_by_sku(sku)

    set_clause = ", ".join([f"`{key}` = %s" for key in update_data.keys()])
    values = list(update_data.values())
    values.append(sku)

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = f"UPDATE inventory SET {set_clause} WHERE sku = %s;"
            cursor.execute(query, values)

            if cursor.rowcount == 0:
                cursor.execute("SELECT 1 FROM inventory WHERE sku = %s;", (sku,))
                if not cursor.fetchone():
                    return None

            cursor.execute("SELECT * FROM inventory WHERE sku = %s;", (sku,))
            return cursor.fetchone()
    finally:
        connection.close()

def delete_inventory(sku: str) -> bool:
    """Deletes an inventory record by SKU."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM inventory WHERE sku = %s;", (sku,))
            return cursor.rowcount > 0
    finally:
        connection.close()