from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field

# Schema phản hồi chi tiết mặt hàng bán chạy (Tab 1: Sales & Profit Overview)
class SalesItemOverview(BaseModel):
    rank: int
    id: str
    name: str
    category: str
    units_sold_adjusted: int
    price: float
    revenue_adjusted: float
    profit_margin: float

    class Config:
        from_attributes = True

# Schema phản hồi các thẻ KPI tổng quan
class SalesKPIResponse(BaseModel):
    total_sales: float
    net_profit: float
    completed_orders: int

# Schema Bộ lọc Doanh thu (Query Parameters)
class SalesFilterQuery(BaseModel):
    top_n: Optional[str] = "5"  # "3", "5", "10", "ALL"
    category: Optional[str] = None  # "Beverage", "Food", "Dessert"
    timeframe: Optional[str] = "monthly"  # "daily", "weekly", "monthly"

# Schema phản hồi Dự báo Nhu cầu & Gợi ý Nhập kho (Tab 2: Demand Prediction & Restock)
class DemandPredictionResponse(BaseModel):
    id: str
    name: str
    current_stock: int
    predicted_demand: int
    suggested_restock: int
    window_days: int
    priority_score: int  # 1: Critical Deficit, 2: Restock Needed, 3: Sufficient Stock
    status_badge: str

    class Config:
        from_attributes = True