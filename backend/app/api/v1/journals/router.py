"""
HabitFlow Pro – Journals API Router.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError
from app.models.journal import Journal
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.journal import JournalCreate, JournalResponse, JournalUpdate

router = APIRouter(prefix="/journals", tags=["Journals"])


@router.get(
    "",
    response_model=SuccessResponse,
    summary="Get all journal entries for current user",
)
def get_journals(
    search: Optional[str] = Query(None, alias="q", description="Search in title, content, or tags"),
    tag: Optional[str] = Query(None, description="Filter by exact tag"),
    entry_date: Optional[date] = Query(None, alias="date", description="Filter by date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the logged in user's journal entries sorted reverse chronologically."""
    query = db.query(Journal).filter(Journal.user_id == current_user.id)

    if entry_date:
        query = query.filter(Journal.entry_date == entry_date)

    if tag:
        query = query.filter(Journal.tags.ilike(f"%{tag}%"))

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Journal.title.ilike(search_term),
                Journal.content.ilike(search_term),
                Journal.tags.ilike(search_term),
            )
        )

    journals = query.order_by(Journal.entry_date.desc(), Journal.created_at.desc()).all()

    return SuccessResponse(
        message="Journal entries retrieved successfully.",
        data=[JournalResponse.model_validate(j).model_dump(mode="json") for j in journals],
    )


@router.post(
    "",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new journal entry",
)
def create_journal(
    body: JournalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new journal entry for today or specified date."""
    entry = Journal(
        user_id=current_user.id,
        title=body.title,
        content=body.content,
        tags=body.tags,
        mood=body.mood,
        entry_date=body.entry_date or date.today(),
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return SuccessResponse(
        message="Journal entry created successfully.",
        data=JournalResponse.model_validate(entry).model_dump(mode="json"),
    )


@router.get(
    "/{journal_id}",
    response_model=SuccessResponse,
    summary="Get a single journal entry",
)
def get_journal(
    journal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single journal entry by ID."""
    entry = db.query(Journal).filter(
        Journal.id == journal_id,
        Journal.user_id == current_user.id
    ).first()

    if not entry:
        raise NotFoundError(message="Journal entry not found.")

    return SuccessResponse(
        message="Journal entry retrieved successfully.",
        data=JournalResponse.model_validate(entry).model_dump(mode="json"),
    )


@router.put(
    "/{journal_id}",
    response_model=SuccessResponse,
    summary="Update a journal entry",
)
def update_journal(
    journal_id: str,
    body: JournalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update details of an existing journal entry."""
    entry = db.query(Journal).filter(
        Journal.id == journal_id,
        Journal.user_id == current_user.id
    ).first()

    if not entry:
        raise NotFoundError(message="Journal entry not found.")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return SuccessResponse(
        message="Journal entry updated successfully.",
        data=JournalResponse.model_validate(entry).model_dump(mode="json"),
    )


@router.delete(
    "/{journal_id}",
    response_model=SuccessResponse,
    summary="Delete a journal entry",
)
def delete_journal(
    journal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a journal entry."""
    entry = db.query(Journal).filter(
        Journal.id == journal_id,
        Journal.user_id == current_user.id
    ).first()

    if not entry:
        raise NotFoundError(message="Journal entry not found.")

    db.delete(entry)
    db.commit()

    return SuccessResponse(
        message="Journal entry deleted successfully.",
        data={"id": journal_id},
    )
