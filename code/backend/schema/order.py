from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    employee_id: int = Field(..., gt=0)
    customer_id: Optional[int] = Field(None, gt=0)
    items: list[OrderItemCreate] = Field(..., min_length=1)

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[str] = None
    customer_type_id: int = Field(1, gt=0)

class DeliveryResponse(BaseModel):
    order_id: int
    created_at: datetime
    deliver_status: str