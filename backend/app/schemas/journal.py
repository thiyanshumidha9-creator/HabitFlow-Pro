"""
HabitFlow Pro – Journal Schemas.
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class JournalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, examples=["Reflections on today"])
    content: str = Field(..., min_length=1, examples=["Had a productive day focusing on core goals."])
    tags: Optional[str] = Field(None, max_length=255, examples=["mindfulness,productivity"])
    mood: Optional[str] = Field(None, max_length=50, examples=["Happy"])
    entry_date: Optional[date] = Field(default_factory=date.today, examples=["2026-07-27"])


class JournalCreate(JournalBase):
    pass


class JournalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    tags: Optional[str] = Field(None, max_length=255)
    mood: Optional[str] = Field(None, max_length=50)
    entry_date: Optional[date] = None


class JournalResponse(JournalBase):
    id: str
    user_id: str
    entry_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
