from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app import db


class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, unique=True, index=True)
    enable_tasks: Mapped[bool] = mapped_column(default=True)
    theme: Mapped[str] = mapped_column(String(10), default='system')
    duration_weeks: Mapped[int] = mapped_column(default=1)
    duration_days: Mapped[int] = mapped_column(default=0)
    duration_hours: Mapped[int] = mapped_column(default=0)
    duration_minutes: Mapped[int] = mapped_column(default=0)
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
    user: Mapped[User] = relationship('User', back_populates='settings')
    always_shown_activities: Mapped[List['UserAlwaysShownActivity']] = relationship(
        'UserAlwaysShownActivity',
        back_populates='settings',
        cascade='all, delete-orphan',
        order_by='UserAlwaysShownActivity.position'
    )
    issue_tracker_sources: Mapped[List['UserIssueTrackerSource']] = relationship(
        'UserIssueTrackerSource',
        back_populates='settings',
        cascade='all, delete-orphan',
        order_by='UserIssueTrackerSource.position'
    )


class UserAlwaysShownActivity(db.Model):
    __tablename__ = 'user_always_shown_activities'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_settings_id: Mapped[int] = mapped_column(ForeignKey('user_settings.id'), nullable=False, index=True)
    activity_uuid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(Text, default='')
    task: Mapped[str] = mapped_column(String(255), default='')
    position: Mapped[int] = mapped_column(default=0)

    # Relationships
    settings: Mapped['UserSettings'] = relationship('UserSettings', back_populates='always_shown_activities')


class UserIssueTrackerSource(db.Model):
    __tablename__ = 'user_issue_tracker_sources'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_settings_id: Mapped[int] = mapped_column(ForeignKey('user_settings.id'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    position: Mapped[int] = mapped_column(default=0)

    # Relationship
    settings: Mapped['UserSettings'] = relationship('UserSettings', back_populates='issue_tracker_sources')
    projects: Mapped[List['UserIssueTrackerProject']] = relationship(
        'UserIssueTrackerProject',
        back_populates='source',
        cascade='all, delete-orphan',
        order_by='UserIssueTrackerProject.position'
    )


class UserIssueTrackerProject(db.Model):
    __tablename__ = 'user_issue_tracker_projects'

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey('user_issue_tracker_sources.id'), nullable=False, index=True)
    project: Mapped[str] = mapped_column(String(64), nullable=False)
    position: Mapped[int] = mapped_column(default=0)

    # Relationships
    source: Mapped['UserIssueTrackerSource'] = relationship('UserIssueTrackerSource', back_populates='projects')
