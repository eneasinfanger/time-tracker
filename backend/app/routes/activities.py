from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta, time as time_obj
from app import db
from app.models.activity import Activity
from app.utils.auth import token_required, admin_required

activities_bp = Blueprint('activities', __name__, url_prefix='/api/activities')


def _parse_activity_date(activity_date: str) -> date | None:
    try:
        return datetime.strptime(activity_date, '%Y-%m-%d').date()
    except ValueError:
        return None


def _get_date_bounds(activity_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(activity_date, time_obj.min)
    return start, start + timedelta(days=1)


def _parse_activity_time(activity_date: date, time_value: str) -> datetime | None:
    if not time_value:
        return None

    try:
        hours, minutes = [int(part) for part in time_value.split(':', 1)]
        return datetime.combine(activity_date, time_obj(hour=hours, minute=minutes))
    except (ValueError, TypeError):
        return None


def _serialize_client_activity(activity: Activity) -> dict:
    data = activity.to_dict()
    data['user_id'] = activity.user_id
    data['username'] = activity.user.username if activity.user else 'Unknown'
    data['full_name'] = activity.user.full_name if activity.user and activity.user.full_name else ''
    data['type'] = 'text' if activity.category == 'text' else 'activity'
    data['task'] = '' if activity.category == 'text' else activity.task_name
    data['startTime'] = activity.start_time.strftime('%H:%M') if activity.start_time else ''
    data['endTime'] = activity.end_time.strftime('%H:%M') if activity.end_time else ''
    return data


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

@activities_bp.route('/day/<string:activity_date>', methods=['GET'])
@token_required
def get_activities_for_day(activity_date):
    parsed_date = _parse_activity_date(activity_date)
    if not parsed_date:
        return jsonify({'error': 'Invalid date format'}), 400

    start_time, end_time = _get_date_bounds(parsed_date)
    activities = Activity.query.filter(
        Activity.user_id == request.current_user.id,
        Activity.start_time >= start_time,
        Activity.start_time < end_time,
    ).order_by(Activity.start_time.asc()).all()

    return jsonify({
        'date': activity_date,
        'activities': [_serialize_client_activity(activity) for activity in activities],
    }), 200


@activities_bp.route('/day/<string:activity_date>', methods=['PUT'])
@token_required
def replace_activities_for_day(activity_date):
    parsed_date = _parse_activity_date(activity_date)
    if not parsed_date:
        return jsonify({'error': 'Invalid date format'}), 400

    data = request.get_json(silent=True) or {}
    incoming_activities = data.get('activities', [])
    if not isinstance(incoming_activities, list):
        return jsonify({'error': 'activities must be an array'}), 400

    start_time, end_time = _get_date_bounds(parsed_date)
    existing_activities = Activity.query.filter(
        Activity.user_id == request.current_user.id,
        Activity.start_time >= start_time,
        Activity.start_time < end_time,
    ).all()

    normalized_activities = []
    for item in incoming_activities:
        if not isinstance(item, dict):
            continue

        start_value = str(item.get('startTime', '')).strip()
        end_value = str(item.get('endTime', '')).strip()
        description = str(item.get('description', '')).strip()
        task = str(item.get('task', '')).strip()
        activity_type = str(item.get('type', 'activity')).strip() or 'activity'

        if not any([start_value, end_value, description, task]):
            continue

        parsed_start_time = _parse_activity_time(parsed_date, start_value)
        if not parsed_start_time:
            continue

        parsed_end_time = _parse_activity_time(parsed_date, end_value) if end_value else None
        duration_minutes = 0
        if parsed_end_time:
            duration_minutes = max(0, int((parsed_end_time - parsed_start_time).total_seconds() / 60))

        normalized_activities.append({
            'task_name': task or description or 'Activity',
            'description': description,
            'category': activity_type if activity_type in ('activity', 'text') else None,
            'start_time': parsed_start_time,
            'end_time': parsed_end_time,
            'duration_minutes': duration_minutes,
            'is_completed': bool(parsed_end_time),
        })

    try:
        for activity in existing_activities:
            db.session.delete(activity)

        created_activities = []
        for item in normalized_activities:
            activity = Activity(
                user_id=request.current_user.id,
                task_name=item['task_name'],
                description=item['description'],
                category=item['category'],
                start_time=item['start_time'],
                end_time=item['end_time'],
                duration_minutes=item['duration_minutes'],
                is_completed=item['is_completed'],
            )
            db.session.add(activity)
            created_activities.append(activity)

        db.session.commit()
        return jsonify({
            'message': 'Activities updated successfully',
            'date': activity_date,
            'activities': [_serialize_client_activity(activity) for activity in created_activities],
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Activity update failed'}), 500


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


@activities_bp.route('/admin/all-activities', methods=['GET'])
@token_required
@admin_required
def get_all_activities_admin():
    """Get all activities for all users (admin only)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    user_id_filter = request.args.get('user_id', type=int)
    
    query = Activity.query.order_by(Activity.created_at.desc())
    
    if user_id_filter:
        query = query.filter_by(user_id=user_id_filter)
    
    paginated = query.paginate(page=page, per_page=per_page)

    def serialize(activity: Activity) -> dict:
        data = activity.to_dict()
        data['user_id'] = activity.user_id
        data['username'] = activity.user.username if activity.user else 'Unknown'
        data['full_name'] = activity.user.full_name if activity.user and activity.user.full_name else ''
        return data
    
    return jsonify({
        'activities': [serialize(activity) for activity in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page
    }), 200


@activities_bp.route('/admin/stats', methods=['GET'])
@token_required
@admin_required
def get_all_stats_admin():
    """Get activity statistics for all users (admin only)"""
    today = date.today()
    
    # Get all activities today
    today_activities = Activity.query.filter(
        db.func.date(Activity.created_at) == today
    ).all()
    
    # Group by user
    user_stats = {}
    for activity in today_activities:
        if activity.user_id not in user_stats:
            user_stats[activity.user_id] = {
                'user_id': activity.user_id,
                'username': activity.user.username if activity.user else 'Unknown',
                'total_activities': 0,
                'completed_activities': 0,
                'total_minutes': 0
            }
        
        user_stats[activity.user_id]['total_activities'] += 1
        if activity.is_completed:
            user_stats[activity.user_id]['completed_activities'] += 1
        if activity.duration_minutes:
            user_stats[activity.user_id]['total_minutes'] += activity.duration_minutes
    
    return jsonify({
        'date': today.isoformat(),
        'user_stats': list(user_stats.values()),
        'total_users_active': len(user_stats),
        'total_activities': len(today_activities),
        'total_minutes': sum(a.duration_minutes for a in today_activities if a.duration_minutes)
    }), 200

