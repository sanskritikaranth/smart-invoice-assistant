import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class InvoiceOut(BaseModel):
    id: int
    product_name: Optional[str]
    brand: Optional[str]
    price: Optional[str]
    instructions: Optional[str]
    competitors: Optional[List[dict]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
