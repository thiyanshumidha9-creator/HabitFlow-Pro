"""
HabitFlow Pro – Habits API Router.
"""

from datetime import date
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError, ValidationError
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.habit import HabitCreate, HabitResponse, HabitUpdate

router = APIRouter(prefix="/habits", tags=["Habits"])


def check_and_update_habit_state(habit: Habit, db: Session) -> None:
    """
    Self-correcting method to update the completion status and streak 
    for daily, weekly, or monthly habits based on current date.
    """
    today = date.today()
    if habit.last_completed_date:
        days_diff = (today - habit.last_completed_date).days
        
        # Determine if streak is broken based on frequency
        if habit.frequency == "Daily":
            limit = 1
        elif habit.frequency == "Weekly":
            limit = 7
        elif habit.frequency == "Monthly":
            limit = 30
        else:
            limit = 1

        if days_diff > limit:
            habit.streak = 0
            
        if days_diff >= 1:
            habit.is_completed_today = False
            db.add(habit)
            db.commit()
            db.refresh(habit)


@router.get(
    "",
    response_model=SuccessResponse,
    summary="Get all habits for current user",
)
def get_habits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the logged in user's habit tracking list."""
    habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
    
    # Process check_and_update_habit_state for each habit
    for habit in habits:
        check_and_update_habit_state(habit, db)
        
    return SuccessResponse(
        message="Habits retrieved successfully.",
        data=[HabitResponse.model_validate(h).model_dump() for h in habits],
    )


@router.get(
    "/logs",
    response_model=SuccessResponse,
    summary="Get habit completion logs for user",
)
def get_habit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve completion logs for all habits owned by current user."""
    logs = db.query(HabitLog).filter(HabitLog.user_id == current_user.id).all()
    logs_data = [
        {
            "id": l.id,
            "habit_id": l.habit_id,
            "completed_date": l.completed_date.isoformat(),
        }
        for l in logs
    ]
    return SuccessResponse(
        message="Habit logs retrieved successfully.",
        data=logs_data,
    )



@router.post(
    "",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new habit",
)
def create_habit(
    body: HabitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new habit tracking routine."""
    habit = Habit(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        category=body.category,
        frequency=body.frequency,
        start_date=body.start_date,
        icon=body.icon,
        color=body.color,
    )
    
    db.add(habit)
    db.commit()
    db.refresh(habit)
    
    return SuccessResponse(
        message="Habit created successfully.",
        data=HabitResponse.model_validate(habit).model_dump(),
    )


@router.put(
    "/{habit_id}",
    response_model=SuccessResponse,
    summary="Update habit details",
)
def update_habit(
    habit_id: str,
    body: HabitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit details of an existing habit routine."""
    habit = db.query(Habit).filter(
        Habit.id == habit_id,
        Habit.user_id == current_user.id
    ).first()
    
    if not habit:
        raise NotFoundError(message="Habit not found.")
        
    # Update fields if provided
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(habit, key, value)
        
    # Recalculate completion rate on change of start_date
    today = date.today()
    total_days = max(1, (today - habit.start_date).days + 1)
    habit.completion_percentage = round(
        min(100.0, (habit.completions_count / total_days) * 100), 1
    )
        
    db.add(habit)
    db.commit()
    db.refresh(habit)
    
    return SuccessResponse(
        message="Habit updated successfully.",
        data=HabitResponse.model_validate(habit).model_dump(),
    )


@router.delete(
    "/{habit_id}",
    response_model=SuccessResponse,
    summary="Delete a habit",
)
def delete_habit(
    habit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a habit routine from database."""
    habit = db.query(Habit).filter(
        Habit.id == habit_id,
        Habit.user_id == current_user.id
    ).first()
    
    if not habit:
        raise NotFoundError(message="Habit not found.")
        
    db.delete(habit)
    db.commit()
    
    return SuccessResponse(
        message="Habit deleted successfully.",
        data={"id": habit_id},
    )


@router.post(
    "/{habit_id}/toggle",
    response_model=SuccessResponse,
    summary="Toggle today's completion status",
)
def toggle_habit(
    habit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a habit as completed today or undo it."""
    habit = db.query(Habit).filter(
        Habit.id == habit_id,
        Habit.user_id == current_user.id
    ).first()
    
    if not habit:
        raise NotFoundError(message="Habit not found.")
        
    # Self-correct first
    check_and_update_habit_state(habit, db)
    
    today = date.today()

    if habit.is_completed_today:
        # Undo completion
        habit.is_completed_today = False
        habit.last_completed_date = None
        habit.streak = max(0, habit.streak - 1)
        habit.completions_count = max(0, habit.completions_count - 1)
        # Remove today's HabitLog entry if exists
        existing_log = db.query(HabitLog).filter(
            HabitLog.habit_id == habit.id,
            HabitLog.user_id == current_user.id,
            HabitLog.completed_date == today,
        ).first()
        if existing_log:
            db.delete(existing_log)
    else:
        # Complete habit
        habit.is_completed_today = True
        habit.last_completed_date = today
        habit.streak += 1
        habit.completions_count += 1
        # Add HabitLog entry if not exists
        existing_log = db.query(HabitLog).filter(
            HabitLog.habit_id == habit.id,
            HabitLog.user_id == current_user.id,
            HabitLog.completed_date == today,
        ).first()
        if not existing_log:
            log = HabitLog(
                habit_id=habit.id,
                user_id=current_user.id,
                completed_date=today,
            )
            db.add(log)

    # Recalculate completion percentage
    total_days = max(1, (today - habit.start_date).days + 1)
    habit.completion_percentage = round(
        min(100.0, (habit.completions_count / total_days) * 100), 1
    )

    db.add(habit)
    db.commit()
    db.refresh(habit)

    return SuccessResponse(
        message="Habit completion status updated.",
        data=HabitResponse.model_validate(habit).model_dump(),
    )



