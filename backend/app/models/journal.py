"""
HabitFlow Pro – Journal ORM Model.
"""

from datetime import date
from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Journal(Base, UUIDMixin, TimestampMixin):
    """
    Journal entry created by a user.

    Columns:
        id          - UUID primary key.
        user_id     - Foreign key to users.id.
        title       - Title of the journal entry.
        content     - Full text content / reflections.
        tags        - Optional comma-separated tags (e.g. "mindfulness,wins").
        mood        - Optional mood identifier (Happy, Neutral, Sad).
        entry_date  - Date of the journal entry (defaults to current date).
    """

    __tablename__ = "journals"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    tags: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    mood: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    entry_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False,
        index=True,
    )

    # Relationship to user
    user: Mapped["User"] = relationship(
        "User",
        backref="journals",
    )

    def __repr__(self) -> str:
        return f"<Journal id={self.id} title={self.title} entry_date={self.entry_date}>"
