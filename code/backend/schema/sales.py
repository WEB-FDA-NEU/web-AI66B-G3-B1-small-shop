from pydantic import BaseModel
from typing import List, Dict, Any

class SalesKpis(BaseModel):
    total_sales: float
    completed_orders: int
    trend: str

class SalesTimeline(BaseModel):
    labels: List[str]
    values: List[float]

class SalesProduct(BaseModel):
    rank: int
    id: str
    name: str
    category: str
    units_sold_adjusted: int
    price: float
    revenue_adjusted: float

class SalesItemOverview(BaseModel):
    kpis: SalesKpis
    timeline: SalesTimeline
    products: List[SalesProduct]