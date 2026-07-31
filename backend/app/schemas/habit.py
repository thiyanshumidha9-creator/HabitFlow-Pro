"""
HabitFlow Pro – Habit Schemas.
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class HabitBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Morning Meditation"])
    description: Optional[str] = Field(None, examples=["10 minutes of mindfulness"])
    category: str = Field(..., max_length=50, examples=["mindfulness"])
    frequency: str = Field(..., max_length=50, examples=["Daily"])
    start_date: date = Field(..., examples=["2026-07-27"])
    icon: Optional[str] = Field(None, max_length=50, examples=["zap"])
    color: Optional[str] = Field(None, max_length=50, examples=["blue"])


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=50)
    start_date: Optional[date] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=50)


class HabitResponse(HabitBase):
    id: str
    user_id: str
    streak: int
    completion_percentage: float
    is_completed_today: bool
    last_completed_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
