from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PasswordChange(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password cannot be empty.")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password cannot exceed 72 UTF-8 bytes.")
        return value


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    role: Literal["Employee", "Manager"]

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip()
        if not username:
            raise ValueError("Username cannot be empty.")
        return username


class UserUpdate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    role: Literal["Employee", "Manager", "Admin"]

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip()
        if not username:
            raise ValueError("Username cannot be empty.")
        return username


class UserResponse(BaseModel):
    user_id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    reset_requested: bool = False
