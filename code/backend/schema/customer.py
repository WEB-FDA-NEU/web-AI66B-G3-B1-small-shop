import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[EmailStr] = None
    customer_type_id: int = Field(1, gt=0)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, email: Optional[str]) -> Optional[str]:
        if not isinstance(email, str):
            return email
        return email.strip() or None

    @field_validator("email")
    @classmethod
    def validate_gmail(cls, email: Optional[EmailStr]) -> Optional[EmailStr]:
        if email is not None and not str(email).lower().endswith("@gmail.com"):
            raise ValueError("Email address must end with @gmail.com.")
        return email

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, phone: str) -> str:
        if not re.fullmatch(r"0[0-9]{9}", phone.strip()):
            raise ValueError("Phone number must be exactly 10 digits and start with 0.")
        return phone.strip()


class CustomerUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=20)
    email: Optional[EmailStr] = None
    customer_type_id: int = Field(..., gt=0)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, email: Optional[str]) -> Optional[str]:
        if not isinstance(email, str):
            return email
        return email.strip() or None

    @field_validator("email")
    @classmethod
    def validate_gmail(cls, email: Optional[EmailStr]) -> Optional[EmailStr]:
        if email is not None and not str(email).lower().endswith("@gmail.com"):
            raise ValueError("Email address must end with @gmail.com.")
        return email

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, phone: str) -> str:
        if not re.fullmatch(r"0[0-9]{9}", phone.strip()):
            raise ValueError("Phone number must be exactly 10 digits and start with 0.")
        return phone.strip()
