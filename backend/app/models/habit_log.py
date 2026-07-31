"""
HabitFlow Pro – Habit Completion Log ORM Model.
"""

from datetime import date
from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from app.models.base import Base, TimestampMixin, UUIDMixin


class HabitLog(Base, UUIDMixin, TimestampMixin):
    """
    Log entry recording a specific date on which a habit was completed.

    Columns:
        id             - UUID primary key.
        habit_id       - Foreign key to habits.id.
        user_id        - Foreign key to users.id.
        completed_date - Date the habit was completed.
    """

    __tablename__ = "habit_logs"

    habit_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("habits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    completed_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    # Relationships
    habit: Mapped["Habit"] = relationship(
        "Habit",
        backref=backref("logs", cascade="all, delete-orphan"),
    )
    user: Mapped["User"] = relationship(
        "User",
        backref="habit_logs",
    )

    def __repr__(self) -> str:
        return f"<HabitLog habit_id={self.habit_id} date={self.completed_date}>"
