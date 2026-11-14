import os
import sys
import calendar
from datetime import date
from typing import List, Dict, Any, Optional, Tuple

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.database.connect_db import get_connection

# Trạng thái đơn hàng được tính vào doanh thu
COMPLETED_STATUS = "Delivered"  # giá trị của cột orders.deliver_status, kiểm tra bằng: SELECT DISTINCT deliver_status FROM orders;

# LƯU Ý: dùng %% vì câu lệnh luôn được truyền kèm params (pymysql sẽ đổi %% -> %)
TIME_COLUMN = "o.created_at"


def _period_conditions(timeframe: str) -> Tuple[str, Optional[str]]:
    """Trả về (điều kiện kỳ hiện tại, điều kiện kỳ trước đó hoặc None)."""
    col = TIME_COLUMN
    if timeframe == "this_day":
        return (
            f"DATE({col}) = CURDATE()",
            f"DATE({col}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
        )
    if timeframe == "this_week":
        return (
            f"YEARWEEK({col}, 1) = YEARWEEK(CURDATE(), 1)",
            f"YEARWEEK({col}, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)",
        )
    if timeframe == "this_month":
        return (
            f"(MONTH({col}) = MONTH(CURDATE()) AND YEAR({col}) = YEAR(CURDATE()))",
            f"(MONTH({col}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) "
            f"AND YEAR({col}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)))",
        )
    # all_time / giá trị không hợp lệ
    return "1=1", None


def _get_totals(cursor, period_cond: str, category: Optional[str]) -> Tuple[float, int]:
    """Tổng doanh thu và số đơn hoàn thành trong một kỳ (có áp dụng lọc category)."""
    query = f"""
        SELECT
            COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales,
            COUNT(DISTINCT o.order_id) AS completed_orders
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.order_id
        JOIN products p ON p.product_id = oi.product_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE o.deliver_status = %s AND ({period_cond})
    """
    params: List[Any] = [COMPLETED_STATUS]
    if category:
        query += " AND c.category_name = %s"
        params.append(category)
    cursor.execute(query, params)
    row = cursor.fetchone() or {}
    return float(row.get("total_sales") or 0), int(row.get("completed_orders") or 0)


def _get_timeline(cursor, timeframe: str, period_cond: str, category: Optional[str]) -> Dict[str, List]:
    """Doanh thu theo từng mốc thời gian (giờ / thứ / tuần / tháng) lấy từ DB."""
    col = TIME_COLUMN

    if timeframe == "this_day":
        bucket_expr = f"HOUR({col})"
    elif timeframe == "this_week":
        bucket_expr = f"WEEKDAY({col})"  # 0 = Monday
    elif timeframe == "this_month":
        bucket_expr = f"FLOOR((DAY({col}) - 1) / 7) + 1"  # tuần 1..5
    else:
        bucket_expr = f"DATE_FORMAT({col}, '%%Y-%%m')"

    query = f"""
        SELECT {bucket_expr} AS bucket,
               COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.order_id
        JOIN products p ON p.product_id = oi.product_id
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE o.deliver_status = %s AND ({period_cond})
    """
    params: List[Any] = [COMPLETED_STATUS]
    if category:
        query += " AND c.category_name = %s"
        params.append(category)
    query += " GROUP BY bucket ORDER BY bucket"
    cursor.execute(query, params)
    revenue_by_bucket = {row["bucket"]: float(row["revenue"]) for row in (cursor.fetchall() or [])}

    if timeframe == "this_day":
        labels = [f"{h:02d}:00" for h in range(24)]
        values = [revenue_by_bucket.get(h, 0.0) for h in range(24)]
    elif timeframe == "this_week":
        labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        values = [revenue_by_bucket.get(i, 0.0) for i in range(7)]
    elif timeframe == "this_month":
        today = date.today()
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        weeks = (days_in_month + 6) // 7
        labels = [f"Week {i}" for i in range(1, weeks + 1)]
        values = [revenue_by_bucket.get(i, 0.0) for i in range(1, weeks + 1)]
    else:
        labels = list(revenue_by_bucket.keys())
        values = list(revenue_by_bucket.values())

    return {"labels": labels, "values": values}


def get_sales_overview(top_n: str = "5", category: Optional[str] = None, timeframe: str = "this_month") -> Dict[str, Any]:
    """Lấy tổng quan doanh thu, KPI, dữ liệu timeline biểu đồ và danh sách sản phẩm theo timeframe (US11)"""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            current_cond, previous_cond = _period_conditions(timeframe)

            # ---------- 1. Danh sách sản phẩm (xếp hạng theo doanh thu) ----------
            query = f"""
                SELECT
                    p.product_id AS id,
                    p.name,
                    c.category_name AS category,
                    p.unit_price AS price,
                    COALESCE(s.units_sold, 0) AS units_sold,
                    COALESCE(s.total_revenue, 0) AS total_revenue
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN (
                    SELECT oi.product_id,
                           SUM(oi.quantity) AS units_sold,
                           SUM(oi.quantity * oi.unit_price) AS total_revenue
                    FROM order_items oi
                    JOIN orders o ON o.order_id = oi.order_id
                    WHERE o.deliver_status = %s AND ({current_cond})
                    GROUP BY oi.product_id
                ) s ON s.product_id = p.product_id
                WHERE 1=1
            """
            params: List[Any] = [COMPLETED_STATUS]
            if category:
                query += " AND c.category_name = %s"
                params.append(category)

            query += " ORDER BY total_revenue DESC, p.name ASC"

            if top_n and str(top_n).upper() != "ALL":
                query += " LIMIT %s"
                params.append(int(top_n))

            cursor.execute(query, params)
            results = cursor.fetchall() or []

            formatted_results = []
            for idx, item in enumerate(results):
                formatted_results.append({
                    "rank": idx + 1,
                    "id": f"P-{str(item['id']).zfill(3)}",
                    "name": item["name"],
                    "category": item["category"] or "General",
                    "units_sold_adjusted": int(item["units_sold"]),
                    "price": float(item["price"]),
                    "revenue_adjusted": float(item["total_revenue"]),
                })

            # ---------- 2. KPI (tính trên toàn bộ đơn, không bị giới hạn bởi top_n) ----------
            total_sales, completed_orders = _get_totals(cursor, current_cond, category)

            trend = ""
            if previous_cond:
                prev_sales, _ = _get_totals(cursor, previous_cond, category)
                if prev_sales > 0:
                    pct = (total_sales - prev_sales) / prev_sales * 100
                    trend = f"{pct:+.0f}% from last period"
                else:
                    trend = "No data for last period"

            # ---------- 3. Timeline biểu đồ ----------
            timeline_data = _get_timeline(cursor, timeframe, current_cond, category)

            return {
                "kpis": {
                    "total_sales": total_sales,
                    "completed_orders": completed_orders,
                    "trend": trend,
                },
                "timeline": timeline_data,
                "products": formatted_results,
            }
    finally:
        connection.close()


def get_demand_predictions(window_days: int = 30) -> List[Dict[str, Any]]:
    """Dự báo nhu cầu và đề xuất nhập hàng (US15, US16)
    Dựa trên doanh số 30 ngày gần nhất của các đơn hoàn thành."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT
                    p.product_id AS id,
                    p.name,
                    COALESCE(s.past_sales, 0) AS past_sales,
                    COALESCE((
                        SELECT SUM(i.quantity) FROM inventory i
                        WHERE i.product_id = p.product_id AND i.status != 'Expired'
                    ), 0) AS current_stock
                FROM products p
                LEFT JOIN (
                    SELECT oi.product_id, SUM(oi.quantity) AS past_sales
                    FROM order_items oi
                    JOIN orders o ON o.order_id = oi.order_id
                    WHERE o.deliver_status = %s
                      AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    GROUP BY oi.product_id
                ) s ON s.product_id = p.product_id
            """
            cursor.execute(query, [COMPLETED_STATUS])
            items = cursor.fetchall() or []

            predictions = []
            for item in items:
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
                    "status_badge": status_badge,
                })
            return predictions
    finally:
        connection.close()