from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta, time as time_obj
from app import db, limiter
from app.models.activity import Activity
from app.utils.auth import token_required, admin_required
from app.utils.rate_limit import authenticated_user_key

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


def _parse_duration_threshold(value) -> timedelta:
    if not isinstance(value, dict):
        return timedelta(weeks=1)

    def to_int(key: str) -> int:
        try:
            return int(value.get(key, 0) or 0)
        except (TypeError, ValueError):
            return 0

    return timedelta(
        weeks=to_int('weeks'),
        days=to_int('days'),
        hours=to_int('hours'),
        minutes=to_int('minutes'),
    )


def _normalize_client_activity(item) -> dict | None:
    if not isinstance(item, dict):
        return None

    activity_type = str(item.get('type', 'activity')).strip() or 'activity'
    if activity_type not in ('activity', 'text'):
        activity_type = 'activity'

    return {
        'id': str(item.get('id', '')).strip(),
        'startTime': str(item.get('startTime', '')).strip(),
        'endTime': str(item.get('endTime', '')).strip(),
        'description': str(item.get('description', '')).strip(),
        'task': str(item.get('task', '')).strip(),
        'type': activity_type,
    }


def _parse_client_activities(items) -> list[dict]:
    if not isinstance(items, list):
        return []
    return [activity for activity in (_normalize_client_activity(item) for item in items) if activity]


def _time_to_minutes(time_value: str) -> int:
    if not time_value:
        return 0

    try:
        hours, minutes = [int(part) for part in time_value.split(':', 1)]
        return hours * 60 + minutes
    except (ValueError, TypeError):
        return 0


def _calculate_duration(start_time: str, end_time: str) -> int:
    if not start_time or not end_time:
        return 0

    start_minutes = _time_to_minutes(start_time)
    end_minutes = _time_to_minutes(end_time)

    if end_minutes < start_minutes:
        return (24 * 60 - start_minutes) + end_minutes

    return end_minutes - start_minutes


def _build_summary(activities: list[dict]) -> dict:
    def build_entries(key: str) -> list[dict]:
        totals: dict[str, dict] = {}

        for activity in activities:
            if activity.get('type') != 'activity':
                continue

            duration = _calculate_duration(activity.get('startTime', ''), activity.get('endTime', ''))
            if duration <= 0:
                continue

            entry_key = activity.get(key, '')
            entry = totals.setdefault(entry_key, {
                'key': entry_key,
                'totalMinutes': 0,
                'activityIds': [],
            })
            entry['totalMinutes'] += duration
            if activity.get('id') not in entry['activityIds']:
                entry['activityIds'].append(activity.get('id'))

        return list(totals.values())

    return {
        'byDescription': build_entries('description'),
        'byTask': build_entries('task'),
    }


def _sort_client_activities(activities: list[dict]) -> list[dict]:
    return sorted(
        activities,
        key=lambda activity: (
            activity.get('startTime') or activity.get('endTime') or '',
            activity.get('endTime') or activity.get('startTime') or '',
            str(activity.get('id', '')),
        ),
    )


def _contains_other(source: str, target: str) -> bool:
    return source.lower() in target.lower()


def _collect_suggestions(source_items: list[dict], field: str, input_value: str, include_exact_match: bool = False) -> list[str]:
    suggestions: list[str] = []
    seen: set[str] = set()
    input_value_lower = input_value.lower().strip()

    for item in source_items:
        candidate = str(item.get(field, '')).strip()
        if not candidate:
            continue
        candidate_lower = candidate.lower()
        if candidate_lower in seen:
            continue
        if input_value_lower:
            if candidate_lower == input_value_lower and not include_exact_match:
                continue
            if not _contains_other(input_value_lower, candidate_lower):
                continue
        seen.add(candidate_lower)
        suggestions.append(candidate)

    return suggestions


def _collect_history_activities(user_id: int, current_date: date, duration_threshold: timedelta, include_current_date: bool) -> list[dict]:
    start_bound = datetime.combine(current_date, time_obj.min) - duration_threshold
    end_bound = datetime.combine(current_date + timedelta(days=1), time_obj.min) if include_current_date else datetime.combine(current_date, time_obj.min)

    activities = Activity.query.filter(
        Activity.user_id == user_id,
        Activity.start_time >= start_bound,
        Activity.start_time < end_bound,
    ).order_by(Activity.start_time.asc()).all()

    return [_serialize_client_activity(activity) for activity in activities]


def _find_current_activity_index(activities: list[dict], current_activity_id: str) -> int:
    for index, activity in enumerate(activities):
        if str(activity.get('id', '')) == current_activity_id:
            return index
    return -1


def _build_suggestion_source(data: dict, current_date: date, duration_threshold: timedelta) -> list[dict]:
    current_activities = _parse_client_activities(data.get('currentActivities', []))
    include_current_date = not current_activities

    history = _collect_history_activities(request.current_user.id, current_date, duration_threshold, include_current_date)
    if current_activities:
        history.extend(current_activities)

    return history


@activities_bp.route('/suggestions', methods=['POST'])
@token_required
@limiter.limit('120 per minute', key_func=authenticated_user_key)
def get_activity_suggestions():
    data = request.get_json(silent=True) or {}
    current_date = _parse_activity_date(str(data.get('date', '')).strip())
    field = str(data.get('field', '')).strip()
    if not current_date or field not in ('description', 'task', 'start', 'end'):
        return jsonify({'error': 'Invalid suggestion request'}), 400

    current_activity_id = str(data.get('currentActivityId', '')).strip()
    current_activities = _parse_client_activities(data.get('currentActivities', []))
    duration_threshold = _parse_duration_threshold(data.get('durationThreshold'))
    input_value = str(data.get('value', '')).strip()

    if field in ('start', 'end'):
        activities = _sort_client_activities(current_activities)
        current_index = _find_current_activity_index(activities, current_activity_id)
        if current_index < 0:
            return jsonify({'suggestions': []}), 200

        if field == 'start':
            before = next(
                (activity for activity in reversed(activities[:current_index])
                 if activity.get('type') == 'activity' and activity.get('endTime')),
                None,
            )
            return jsonify({'suggestions': [before['endTime']] if before else []}), 200

        after = next(
            (activity for activity in activities[current_index + 1:]
             if activity.get('type') == 'activity' and activity.get('startTime')),
            None,
        )
        return jsonify({'suggestions': [after['startTime']] if after else []}), 200

    history = _build_suggestion_source(data, current_date, duration_threshold)
    activity_type = str(data.get('activityType', 'activity')).strip() or 'activity'
    if activity_type not in ('activity', 'text'):
        activity_type = 'activity'

    include_settings = field == 'task' or activity_type == 'activity'
    if include_settings:
        for item in data.get('alwaysShownActivities', []):
            normalized = _normalize_client_activity(item)
            if normalized:
                history.append(normalized)

    if field == 'description':
        history = [activity for activity in history if activity.get('type') == activity_type]
        suggestions = _collect_suggestions(history, 'description', input_value)
    else:
        history = [activity for activity in history if activity.get('type') == 'activity']
        suggestions = _collect_suggestions(history, 'task', input_value)

    return jsonify({'suggestions': suggestions}), 200


@activities_bp.route('/summary', methods=['POST'])
@token_required
@limiter.limit('120 per minute', key_func=authenticated_user_key)
def calculate_activity_summary():
    data = request.get_json(silent=True) or {}
    activities = _parse_client_activities(data.get('activities', []))
    return jsonify({'summary': _build_summary(activities)}), 200


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

    client_activities = [_serialize_client_activity(activity) for activity in activities]

    return jsonify({
        'date': activity_date,
        'activities': client_activities,
        'summary': _build_summary(client_activities),
    }), 200


@activities_bp.route('/day/<string:activity_date>', methods=['PUT'])
@activities_bp.route('/day/<string:activity_date>', methods=['PUT', 'POST'])
@token_required
@limiter.limit('60 per minute', key_func=authenticated_user_key)
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
        # Allow text/comment activities without explicit start time: assign start of day
        if not parsed_start_time:
            if activity_type == 'text':
                parsed_start_time = datetime.combine(parsed_date, time_obj.min)
            else:
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
        client_activities = [_serialize_client_activity(activity) for activity in created_activities]
        return jsonify({
            'message': 'Activities updated successfully',
            'date': activity_date,
            'activities': client_activities,
            'summary': _build_summary(client_activities),
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Activity update failed'}), 500


@activities_bp.route('', methods=['POST'])
@token_required
@limiter.limit('60 per minute', key_func=authenticated_user_key)
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
@limiter.limit('60 per minute', key_func=authenticated_user_key)
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
@limiter.limit('60 per minute', key_func=authenticated_user_key)
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
@limiter.limit('60 per minute', key_func=authenticated_user_key)
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
@limiter.limit('60 per minute', key_func=authenticated_user_key)
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


@activities_bp.route('/admin/aggregate', methods=['GET'])
@token_required
@admin_required
@limiter.limit('60 per minute', key_func=authenticated_user_key)
def admin_aggregate():
    """Aggregate tracked minutes by period: day, week, or month.
    Query params:
      - period: 'day' | 'week' | 'month'
      - date: ISO date (YYYY-MM-DD) to anchor the range (optional, defaults to today)
    Returns JSON list of { 'label': str, 'total_minutes': int }
    """
    from datetime import datetime, timedelta, date

    period = request.args.get('period', 'day')
    date_str = request.args.get('date')
    try:
        anchor = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else date.today()
    except Exception:
        anchor = date.today()

    results = []
    if period == 'day':
        # return single day total
        activities = Activity.query.filter(db.func.date(Activity.created_at) == anchor).all()
        total = sum(a.duration_minutes for a in activities if a.duration_minutes)
        results = [{'label': anchor.isoformat(), 'total_minutes': total}]
    elif period == 'week':
        # week starting Monday
        start = anchor - timedelta(days=anchor.weekday())
        for i in range(7):
            d = start + timedelta(days=i)
            activities = Activity.query.filter(db.func.date(Activity.created_at) == d).all()
            total = sum(a.duration_minutes for a in activities if a.duration_minutes)
            results.append({'label': d.isoformat(), 'total_minutes': total})
    elif period == 'month':
        # month days
        start = anchor.replace(day=1)
        # compute number of days in month
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        current = start
        while current < next_month:
            activities = Activity.query.filter(db.func.date(Activity.created_at) == current).all()
            total = sum(a.duration_minutes for a in activities if a.duration_minutes)
            results.append({'label': current.isoformat(), 'total_minutes': total})
            current = current + timedelta(days=1)
    else:
        return jsonify({'error': 'Invalid period'}), 400

    return jsonify({'period': period, 'anchor': anchor.isoformat(), 'data': results}), 200

