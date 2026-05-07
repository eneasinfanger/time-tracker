from flask import Blueprint, request, jsonify
from datetime import datetime
from app import db
from app.models.activity import Activity
from app.utils.auth import token_required

activities_bp = Blueprint('activities', __name__, url_prefix='/api/activities')

@activities_bp.route('', methods=['GET'])
@token_required
def get_activities():
    """Get all activities for current user"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated = Activity.query.filter_by(user_id=request.current_user.id)\
        .order_by(Activity.created_at.desc())\
        .paginate(page=page, per_page=per_page)
    
    return jsonify({
        'activities': [activity.to_dict() for activity in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page
    }), 200

@activities_bp.route('', methods=['POST'])
@token_required
def create_activity():
    """Create new activity"""
    data = request.get_json()
    
    if not data or 'task_name' not in data:
        return jsonify({'error': 'task_name is required'}), 400
    
    task_name = data.get('task_name', '').strip()
    if not task_name:
        return jsonify({'error': 'task_name cannot be empty'}), 400
    
    try:
        start_time = datetime.fromisoformat(data.get('start_time', datetime.utcnow().isoformat()))
    except (ValueError, TypeError):
        start_time = datetime.utcnow()
    
    activity = Activity(
        user_id=request.current_user.id,
        task_name=task_name,
        description=data.get('description', '').strip(),
        category=data.get('category', '').strip(),
        start_time=start_time
    )
    
    try:
        db.session.add(activity)
        db.session.commit()
        return jsonify({
            'message': 'Activity created successfully',
            'activity': activity.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Activity creation failed'}), 500

@activities_bp.route('/<int:activity_id>', methods=['GET'])
@token_required
def get_activity(activity_id):
    """Get specific activity"""
    activity = Activity.query.get(activity_id)
    
    if not activity:
        return jsonify({'error': 'Activity not found'}), 404
    
    # Check ownership
    if activity.user_id != request.current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    return jsonify(activity.to_dict()), 200

@activities_bp.route('/<int:activity_id>', methods=['PUT'])
@token_required
def update_activity(activity_id):
    """Update activity"""
    activity = Activity.query.get(activity_id)
    
    if not activity:
        return jsonify({'error': 'Activity not found'}), 404
    
    if activity.user_id != request.current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    data = request.get_json()
    
    if 'task_name' in data:
        task_name = data['task_name'].strip()
        if task_name:
            activity.task_name = task_name
    
    if 'description' in data:
        activity.description = data['description'].strip()
    
    if 'category' in data:
        activity.category = data['category'].strip()
    
    if 'end_time' in data:
        try:
            activity.end_time = datetime.fromisoformat(data['end_time'])
            # Calculate duration
            if activity.start_time and activity.end_time:
                duration = (activity.end_time - activity.start_time).total_seconds() / 60
                activity.duration_minutes = int(duration)
        except (ValueError, TypeError):
            pass
    
    if 'is_completed' in data:
        activity.is_completed = data['is_completed']
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Activity updated successfully',
            'activity': activity.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Activity update failed'}), 500

@activities_bp.route('/<int:activity_id>', methods=['DELETE'])
@token_required
def delete_activity(activity_id):
    """Delete activity"""
    activity = Activity.query.get(activity_id)
    
    if not activity:
        return jsonify({'error': 'Activity not found'}), 404
    
    if activity.user_id != request.current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    try:
        db.session.delete(activity)
        db.session.commit()
        return jsonify({'message': 'Activity deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Activity deletion failed'}), 500

@activities_bp.route('/stats/today', methods=['GET'])
@token_required
def get_today_stats():
    """Get today's activity statistics"""
    from datetime import date
    
    today = date.today()
    activities = Activity.query.filter(
        Activity.user_id == request.current_user.id,
        db.func.date(Activity.created_at) == today
    ).all()
    
    total_minutes = sum(a.duration_minutes for a in activities if a.duration_minutes)
    completed = sum(1 for a in activities if a.is_completed)
    
    return jsonify({
        'date': today.isoformat(),
        'total_activities': len(activities),
        'completed_activities': completed,
        'total_minutes': total_minutes,
        'activities': [a.to_dict() for a in activities]
    }), 200
