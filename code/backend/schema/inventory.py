from typing import Optional
from datetime import date
from pydantic import BaseModel, Field, ConfigDict

class InventoryBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=100)
    category: str = Field("General", max_length=50)       # Trường Frontend dùng để hiển thị chữ Category
    category_name: Optional[str] = "General"              # Trường dự phòng từ database
    unit_price: float = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)
    min_stock: int = Field(10, ge=0)
    image: Optional[str] = Field(None, max_length=255)

class InventoryCreate(InventoryBase):
    sku: Optional[str] = Field(None, max_length=20)

class InventoryUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    category_name: Optional[str] = None
    unit_price: Optional[float] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    min_stock: Optional[int] = Field(None, ge=0)
    image: Optional[str] = Field(None, max_length=255)

class InventoryResponse(InventoryBase):
    sku: str
    import_date: date
    status: str
    badge_class: str

    model_config = ConfigDict(from_attributes=True)