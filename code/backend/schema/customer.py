import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    customer_type_id: int = Field(1, gt=0)

class CustomerUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    customer_type_id: int = Field(..., gt=0)