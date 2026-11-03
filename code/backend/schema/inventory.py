from typing import Optional
from datetime import date
from pydantic import BaseModel, Field

class InventoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., max_length=50)
    price: float = Field(..., ge=0)
    stock: int = Field(..., ge=0)
    min_stock: int = Field(10, ge=0)
    image: Optional[str] = Field(None, max_length=255)

class InventoryCreate(InventoryBase):
    sku: Optional[str] = Field(None, max_length=20)  # Tự sinh nếu không truyền (e.g., P-008)

class InventoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    price: Optional[float] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    min_stock: Optional[int] = Field(None, ge=0)
    image: Optional[str] = Field(None, max_length=255)

class InventoryResponse(InventoryBase):
    sku: str
    import_date: date
    status: str
    badge_class: str

    class Config:
        from_attributes = True