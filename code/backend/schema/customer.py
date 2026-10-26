from typing import Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[str] = None
    customer_type_id: int = Field(1, gt=0)


class CustomerUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[str] = None
    customer_type_id: int = Field(..., gt=0)
