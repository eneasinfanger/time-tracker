from app import db
from datetime import date, time, datetime

class Activity(db.Model):
    """Activity/Task model for time tracking"""
    __tablename__ = 'activities'

    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    task_name: str = db.Column(db.String(255), nullable=False)
    description: str = db.Column(db.Text)
    category: str = db.Column(db.String(50))
    start_time: time = db.Column(db.Time)
    end_time: time = db.Column(db.Time)
    day_date: date = db.Column(db.Date, nullable=False)
    position: int = db.Column(db.Integer, nullable=False)
    duration_minutes: int = db.Column(db.Integer, default=0)
    is_completed: bool = db.Column(db.Boolean, default=False)
    created_at: datetime = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at: datetime = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        """Convert activity to dictionary"""
        return {
            'id': self.id,
            'task_name': self.task_name,
            'description': self.description,
            'category': self.category,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'position': self.position,
            'duration_minutes': self.duration_minutes,
            'is_completed': self.is_completed,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
