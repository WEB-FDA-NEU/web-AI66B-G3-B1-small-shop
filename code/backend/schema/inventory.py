from typing import Optional, Union
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


class InventoryBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=100)
    category_id: int = Field(..., ge=1, description="ID của danh mục sản phẩm")
    unit_price: float = Field(..., ge=0)
    stock_quantity: int = Field(..., ge=0)
    image: Optional[str] = Field(None, max_length=255)


class InventoryCreate(InventoryBase):
    sku: Optional[str] = Field(None, max_length=20)


class InventoryUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[int] = Field(None, ge=1)
    unit_price: Optional[float] = Field(None, ge=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    image: Optional[str] = Field(None, max_length=255)


class InventoryResponse(BaseModel):
    """Một dòng = một lô nhập kho (một record trong bảng inventory)."""
    inventory_id: int
    inventory_code: str                      # ví dụ 'INV-012', dùng cho PUT/DELETE
    product_id: int
    product_code: str                        # ví dụ 'P-001'
    product_name: str
    category_id: Optional[int] = None
    category: Optional[str] = "General"
    category_name: Optional[str] = "General"
    unit_price: float
    is_available: Optional[bool] = None
    stock_quantity: int                      # số lượng của lô này
    import_date: Optional[Union[date, datetime]] = None
    expiry_date: Optional[Union[date, datetime]] = None
    status: str
    badge_class: str

    model_config = ConfigDict(from_attributes=True)