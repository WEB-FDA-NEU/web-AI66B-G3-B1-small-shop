from typing import Optional
from pydantic import BaseModel, Field

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category_id: Optional[int] = None
    unit_price: float = Field(..., ge=0)
    is_available: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[int] = None
    unit_price: Optional[float] = Field(None, ge=0)
    is_available: Optional[bool] = None

class ProductResponse(ProductBase):
    product_id: int

    class Config:
        from_attributes = True