from datetime import date, datetime, time, timezone
from typing import Optional
from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app import db


class Activity(db.Model):
    """Activity/Task model for time tracking"""
    __tablename__ = 'activities'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    start_time: Mapped[Optional[time]] = mapped_column(nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(nullable=True)
    day_date: Mapped[date] = mapped_column(nullable=False)
    position: Mapped[int] = mapped_column(nullable=False)
    duration_minutes: Mapped[int] = mapped_column(default=0)
    is_completed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    # Relationships
    user: Mapped['User'] = relationship('User', back_populates='activities')

    def to_dict(self) -> dict:
        """Convert activity to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'task_name': self.task_name,
            'description': self.description,
            'category': self.category,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'day_date': self.day_date.isoformat() if self.day_date else None,
            'position': self.position,
            'duration_minutes': self.duration_minutes,
            'is_completed': self.is_completed,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
