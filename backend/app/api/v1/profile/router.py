"""Authenticated profile and transactional data restore endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.exceptions import AuthenticationError, ConflictError, ValidationError
from app.core.security import hash_password, verify_password
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.journal import Journal
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.schemas.profile import BackupRestore, PasswordChange, ProfileUpdate
from app.schemas.user import UserResponse
from app.services.analytics_service import build_analytics

router = APIRouter(tags=["Profile & Data"])


@router.put("/profile", response_model=SuccessResponse)
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.email and body.email.lower() != current_user.email:
        duplicate = db.query(User).filter(User.email == body.email.lower(), User.id != current_user.id).first()
        if duplicate:
            raise ConflictError(message="Email address is already registered.", errors=[{"field": "email", "message": "Email is already registered."}])
        current_user.email = body.email.lower().strip()
    if body.full_name is not None:
        current_user.full_name = body.full_name.strip()
    if body.phone is not None:
        current_user.phone = body.phone.strip() if body.phone.strip() else None
    if body.avatar is not None:
        current_user.avatar = body.avatar.strip() if body.avatar.strip() else None
    db.add(current_user); db.commit(); db.refresh(current_user)
    return SuccessResponse(message="Profile updated successfully.", data={"user": UserResponse.model_validate(current_user).model_dump()})


@router.put("/profile/password", response_model=SuccessResponse)
def change_password(body: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, current_user.password_hash):
        raise AuthenticationError(message="Current password is incorrect.")
    current_user.password_hash = hash_password(body.new_password)
    db.add(current_user); db.commit()
    return SuccessResponse(message="Password changed successfully.")


@router.get("/profile/stats", response_model=SuccessResponse)
def profile_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    analytics = build_analytics(db, current_user.id)
    summary = analytics["summary"]
    achievements = analytics["achievements"]
    return SuccessResponse(message="Profile statistics retrieved.", data={
        "total_habits": summary["total_habits"],
        "completed_habits": db.query(HabitLog).filter(HabitLog.user_id == current_user.id).count(),
        "current_streak": summary["current_streak"],
        "longest_streak": summary["longest_streak"],
        "total_journal_entries": summary["total_journal_entries"],
        "achievements_earned": sum(item["unlocked"] for item in achievements),
        "completion_rate": summary["completion_rate"],
        "achievements": achievements,
    })


@router.get("/data/backup", response_model=SuccessResponse)
def backup_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    analytics = build_analytics(db, current_user.id)
    habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
    journals = db.query(Journal).filter(Journal.user_id == current_user.id).all()
    logs = db.query(HabitLog).filter(HabitLog.user_id == current_user.id).all()
    return SuccessResponse(message="Backup created.", data={
        "format": "habitflow-pro-backup", "version": 1,
        "profile": UserResponse.model_validate(current_user).model_dump(mode="json"),
        "habits": [{c.name: getattr(h, c.name) for c in Habit.__table__.columns if c.name != "user_id"} for h in habits],
        "habit_logs": [{"habit_id": x.habit_id, "completed_date": x.completed_date.isoformat()} for x in logs],
        "journal_entries": [{c.name: getattr(j, c.name) for c in Journal.__table__.columns if c.name != "user_id"} for j in journals],
        "achievements": analytics["achievements"],
    })


@router.post("/data/restore", response_model=SuccessResponse)
def restore_data(body: BackupRestore, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.format != "habitflow-pro-backup" or body.version != 1:
        raise ValidationError(message="Unsupported HabitFlow backup format or version.")
    try:
        db.query(HabitLog).filter(HabitLog.user_id == current_user.id).delete(synchronize_session=False)
        db.query(Habit).filter(Habit.user_id == current_user.id).delete(synchronize_session=False)
        db.query(Journal).filter(Journal.user_id == current_user.id).delete(synchronize_session=False)
        id_map = {}
        for item in body.habits:
            values = item.model_dump(exclude={"id"})
            habit = Habit(user_id=current_user.id, **values)
            db.add(habit); db.flush()
            if item.id: id_map[item.id] = habit.id
        for entry in body.journal_entries:
            db.add(Journal(user_id=current_user.id, **entry.model_dump()))
        for log in body.habit_logs:
            habit_id = id_map.get(log.habit_id)
            if habit_id: db.add(HabitLog(user_id=current_user.id, habit_id=habit_id, completed_date=log.completed_date))
        profile = body.profile or {}
        if isinstance(profile.get("full_name"), str) and 2 <= len(profile["full_name"].strip()) <= 150:
            current_user.full_name = profile["full_name"].strip()
        db.commit()
    except Exception:
        db.rollback()
        raise ValidationError(message="Backup could not be restored because its data is invalid.")
    return SuccessResponse(message="Backup restored successfully.", data={"habits": len(body.habits), "journal_entries": len(body.journal_entries)})
