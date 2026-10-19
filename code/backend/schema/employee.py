from typing import Optional
from datetime import date
from pydantic import BaseModel, EmailStr, Field

class EmployeeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    role: str = Field(..., max_length=30)
    status: str = Field("Active", max_length=20)

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, max_length=30)
    status: Optional[str] = Field(None, max_length=20)

class EmployeeResponse(EmployeeBase):
    employee_id: int
    created_at: date

    class Config:
        from_attributes = True