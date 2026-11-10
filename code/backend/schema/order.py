from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    username: str = Field(..., min_length=1)
    customer_id: Optional[int] = Field(None, gt=0)
    note: Optional[str] = None
    items: list[OrderItemCreate] = Field(..., min_length=1)

class DeliveryResponse(BaseModel):
    order_id: int
    created_at: datetime
    deliver_status: str

class OrderNoteUpdate(BaseModel):
    note: Optional[str] = None