"""
HabitFlow Pro – Habit ORM Model.
"""

from datetime import date
from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Habit(Base, UUIDMixin, TimestampMixin):
    """
    Habit tracked by a user.

    Columns:
        id                    - UUID primary key.
        user_id               - Foreign key to users.id.
        name                  - Name of the habit.
        description           - Optional detailed description.
        category              - Category (e.g. mindfulness, health, productivity, learning).
        frequency             - Frequency (Daily, Weekly, Monthly).
        start_date            - Starting date of the habit.
        icon                  - Selected icon identifier.
        color                 - Theme color identifier.
        streak                - Current consecutive streak count.
        completion_percentage - Total completion rate percentage.
        is_completed_today    - Flag showing if completed today.
        last_completed_date   - Date of the last completion.
    """

    __tablename__ = "habits"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    frequency: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    icon: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    color: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    streak: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    completions_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    completion_percentage: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    is_completed_today: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    last_completed_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    # Relationship to user
    user: Mapped["User"] = relationship(
        "User",
        backref="habits",
    )

    def __repr__(self) -> str:
        return f"<Habit id={self.id} name={self.name} user_id={self.user_id}>"
