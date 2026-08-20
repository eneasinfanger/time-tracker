from datetime import datetime

from app import db


class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    enable_tasks = db.Column(db.Boolean, nullable=False, default=True)
    theme = db.Column(db.String(10), nullable=False, default='system')
    duration_weeks = db.Column(db.Integer, nullable=False, default=1)
    duration_days = db.Column(db.Integer, nullable=False, default=0)
    duration_hours = db.Column(db.Integer, nullable=False, default=0)
    duration_minutes = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    always_shown_activities = db.relationship(
        'UserAlwaysShownActivity',
        backref='settings',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='UserAlwaysShownActivity.position.asc()',
    )
    issue_tracker_sources = db.relationship(
        'UserIssueTrackerSource',
        backref='settings',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='UserIssueTrackerSource.position.asc()',
    )


class UserAlwaysShownActivity(db.Model):
    __tablename__ = 'user_always_shown_activities'

    id = db.Column(db.Integer, primary_key=True)
    user_settings_id = db.Column(db.Integer, db.ForeignKey('user_settings.id'), nullable=False, index=True)
    activity_uuid = db.Column(db.String(64))
    description = db.Column(db.Text, nullable=False, default='')
    task = db.Column(db.String(255), nullable=False, default='')
    position = db.Column(db.Integer, nullable=False, default=0)


class UserIssueTrackerSource(db.Model):
    __tablename__ = 'user_issue_tracker_sources'

    id = db.Column(db.Integer, primary_key=True)
    user_settings_id = db.Column(db.Integer, db.ForeignKey('user_settings.id'), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    url = db.Column(db.String(512), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)

    projects = db.relationship(
        'UserIssueTrackerProject',
        backref='source',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='UserIssueTrackerProject.position.asc()',
    )


class UserIssueTrackerProject(db.Model):
    __tablename__ = 'user_issue_tracker_projects'

    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.Integer, db.ForeignKey('user_issue_tracker_sources.id'), nullable=False, index=True)
    project = db.Column(db.String(64), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
