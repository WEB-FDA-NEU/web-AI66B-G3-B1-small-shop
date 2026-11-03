from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field, ConfigDict

# Schema phản hồi chi tiết mặt hàng bán chạy (Tab 1: Sales & Profit Overview)
class SalesItemOverview(BaseModel):
    rank: Optional[int] = 1
    id: Optional[str] = "P-001"
    name: str
    category: Optional[str] = "General"
    units_sold_adjusted: Optional[int] = 0
    price: Optional[float] = 0.0
    revenue_adjusted: Optional[float] = 0.0
    profit_margin: Optional[float] = 40.0

    model_config = ConfigDict(from_attributes=True)

# Schema phản hồi các thẻ KPI tổng quan
class SalesKPIResponse(BaseModel):
    total_sales: float = 0.0
    net_profit: float = 0.0
    completed_orders: int = 0

    model_config = ConfigDict(from_attributes=True)

# Schema Bộ lọc Doanh thu (Query Parameters)
class SalesFilterQuery(BaseModel):
    top_n: Optional[str] = "5"  # "3", "5", "10", "ALL"
    category: Optional[str] = None  
    timeframe: Optional[str] = "monthly"  

# Schema phản hồi Dự báo Nhu cầu & Gợi ý Nhập kho (Tab 2: Demand Prediction & Restock)
class DemandPredictionResponse(BaseModel):
    id: Optional[str] = "P-001"
    name: str
    current_stock: Optional[int] = 0
    predicted_demand: Optional[int] = 0
    suggested_restock: Optional[int] = 0
    window_days: Optional[int] = 30
    priority_score: Optional[int] = 1  
    status_badge: Optional[str] = "<span class=\"badge badge-success\">Sufficient Stock</span>"

    model_config = ConfigDict(from_attributes=True)