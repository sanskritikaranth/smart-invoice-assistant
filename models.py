import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invoices = relationship("Invoice", back_populates="owner", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    product_name = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    price = Column(String, nullable=True)
    instructions = Column(Text, nullable=True)

    # Competitor research is a variable-shaped list, so it's stored as a JSON string
    # rather than a separate table -- keeps things simple until it needs to be queried on.
    competitors_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="invoices")
