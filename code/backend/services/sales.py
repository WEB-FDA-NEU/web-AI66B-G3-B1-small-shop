import os
import sys
from typing import List, Dict, Any, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection

def get_sales_overview(top_n: str = "5", category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lấy tổng quan doanh thu theo sản phẩm (US11)"""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT 
                    p.product_id AS id,
                    p.name,
                    c.category_name AS category,
                    p.unit_price AS price,
                    COALESCE(SUM(oi.quantity), 0) AS units_sold,
                    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN order_items oi ON p.product_id = oi.product_id
                WHERE 1=1
            """
            params = []
            if category:
                query += " AND c.category_name = %s"
                params.append(category)

            query += " GROUP BY p.product_id, p.name, c.category_name, p.unit_price ORDER BY total_revenue DESC"

            if top_n and top_n.upper() != "ALL":
                query += " LIMIT %s"
                params.append(int(top_n))

            cursor.execute(query, params)
            results = cursor.fetchall() or []
            
            # Tính toán thêm lợi nhuận giả định (ví dụ margin 40%) cho khớp giao diện
            formatted_results = []
            for idx, item in enumerate(results):
                formatted_results.append({
                    "rank": idx + 1,
                    "id": f"P-{str(item['id']).zfill(3)}",
                    "name": item["name"],
                    "category": item["category"] or "General",
                    "units_sold_adjusted": item["units_sold"],
                    "price": float(item["price"]),
                    "revenue_adjusted": float(item["total_revenue"]),
                    "profit_margin": 40.0
                })
            return formatted_results
    finally:
        connection.close()

def get_demand_predictions(window_days: int = 30) -> List[Dict[str, Any]]:
    """Dự báo nhu cầu và đề xuất nhập hàng (US15, US16)"""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT 
                    p.product_id AS id,
                    p.name,
                    COALESCE(SUM(oi.quantity), 0) AS past_sales,
                    COALESCE((SELECT SUM(quantity) FROM inventory i WHERE i.product_id = p.product_id AND i.status != 'Expired'), 0) AS current_stock
                FROM products p
                LEFT JOIN order_items oi ON p.product_id = oi.product_id
                GROUP BY p.product_id, p.name;
            """
            cursor.execute(query)
            items = cursor.fetchall() or []

            predictions = []
            for item in items:
                # Ép kiểu Decimal từ MySQL sang float và int để tránh lỗi phép tính
                past_sales = float(item["past_sales"]) if item["past_sales"] is not None else 0.0
                current_stock = int(item["current_stock"]) if item["current_stock"] is not None else 0

                daily_rate = past_sales / 30.0 
                predicted_demand = int(round(daily_rate * window_days))
                suggested_restock = max(0, predicted_demand - current_stock + 10)

                if current_stock <= 5:
                    status_badge = '<span class="badge badge-danger">Critical Deficit</span>'
                elif suggested_restock > 0:
                    status_badge = '<span class="badge badge-warning">Restock Needed</span>'
                else:
                    status_badge = '<span class="badge badge-success">Sufficient Stock</span>'

                predictions.append({
                    "id": f"P-{str(item['id']).zfill(3)}",
                    "name": item["name"],
                    "current_stock": current_stock,
                    "predicted_demand": predicted_demand,
                    "suggested_restock": suggested_restock,
                    "status_badge": status_badge
                })
            return predictions
    finally:
        connection.close()