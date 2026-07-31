"""Sprint 6 profile and validated backup request schemas."""
from datetime import date
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150)
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class BackupHabit(BaseModel):
    id: str | None = None
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: str = Field(..., max_length=50)
    frequency: str = Field(..., max_length=50)
    start_date: date
    icon: str | None = Field(None, max_length=50)
    color: str | None = Field(None, max_length=50)
    streak: int = Field(0, ge=0)
    completions_count: int = Field(0, ge=0)
    completion_percentage: float = Field(0, ge=0, le=100)
    is_completed_today: bool = False
    last_completed_date: date | None = None


class BackupHabitLog(BaseModel):
    habit_id: str
    completed_date: date


class BackupJournal(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    tags: str | None = Field(None, max_length=255)
    mood: str | None = Field(None, max_length=50)
    entry_date: date


class BackupRestore(BaseModel):
    format: str
    version: int
    exported_at: str | None = None
    profile: dict[str, Any] | None = None
    profile_picture: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    habits: list[BackupHabit]
    habit_logs: list[BackupHabitLog] = Field(default_factory=list)
    journal_entries: list[BackupJournal]
    achievements: list[dict[str, Any]] = Field(default_factory=list)
