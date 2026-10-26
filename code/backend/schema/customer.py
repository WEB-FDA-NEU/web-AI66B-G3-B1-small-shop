import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[str] = None
    customer_type_id: int = Field(1, gt=0)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, phone: str) -> str:
        if not re.fullmatch(r"0[0-9]{9}", phone.strip()):
            raise ValueError("Phone number must be exactly 10 digits and start with 0.")
        return phone.strip()


class CustomerUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[str] = None
    customer_type_id: int = Field(..., gt=0)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, phone: str) -> str:
        if not re.fullmatch(r"0[0-9]{9}", phone.strip()):
            raise ValueError("Phone number must be exactly 10 digits and start with 0.")
        return phone.strip()
