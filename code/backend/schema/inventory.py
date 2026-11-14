from typing import Optional
from datetime import date
from pydantic import BaseModel, Field, ConfigDict

class InventoryBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=100)
    category_id: int = Field(..., ge=1, description="ID của danh mục sản phẩm (1-6)")  # Đổi thành category_id chuẩn kiểu int
    unit_price: float = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)
    min_stock: int = Field(10, ge=0)
    image: Optional[str] = Field(None, max_length=255)

class InventoryCreate(InventoryBase):
    sku: Optional[str] = Field(None, max_length=20)

class InventoryUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    min_stock: Optional[int] = Field(None, ge=0)
    image: Optional[str] = Field(None, max_length=255)

class InventoryResponse(InventoryBase):
    sku: str
    category: Optional[str] = "General"     # Giữ lại để hiển thị tên danh mục trả về từ JOIN cơ sở dữ liệu
    category_name: Optional[str] = "General"
    import_date: date
    status: str
    badge_class: str

    model_config = ConfigDict(from_attributes=True)