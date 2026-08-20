from flask import Blueprint, request, jsonify
from app import db, limiter
from app.models.user import User
from app.models.user_settings import UserSettings
from app.utils.auth import token_required, admin_required
from app.utils.rate_limit import authenticated_user_key
from app.utils.user_settings_storage import parse_settings_payload, read_settings_from_row, write_settings_to_row

users_bp = Blueprint('users', __name__, url_prefix='/users')


@users_bp.route('/me/settings', methods=['GET'])
@token_required
@limiter.limit('60 per minute', key_func=authenticated_user_key)
def get_current_user_settings():
    settings_row = UserSettings.query.filter_by(user_id=request.current_user.id).first()
    settings_data = read_settings_from_row(settings_row)
    return jsonify({'settings': settings_data.to_api_dict()}), 200


@users_bp.route('/me/settings', methods=['PUT'])
@token_required
@limiter.limit('60 per minute', key_func=authenticated_user_key)
def update_current_user_settings():
    data = request.get_json(silent=True) or {}
    incoming = data.get('settings')
    if not isinstance(incoming, dict):
        return jsonify({'error': 'settings must be an object'}), 400

    settings_row = UserSettings.query.filter_by(user_id=request.current_user.id).first()
    if not settings_row:
        settings_row = UserSettings(user_id=request.current_user.id)
        db.session.add(settings_row)
        db.session.flush()

    settings_data = parse_settings_payload(incoming)
    write_settings_to_row(settings_row, settings_data)

    try:
        db.session.commit()
        return jsonify({
            'message': 'Settings updated successfully',
            'settings': settings_data.to_api_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Settings update failed'}), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    """Get user profile"""
    # Users can only view their own profile unless admin
    if request.current_user.id != user_id and not request.current_user.is_admin:
        return jsonify({'error': 'Forbidden'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict(include_email=True)), 200

@users_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
@limiter.limit('30 per minute', key_func=authenticated_user_key)
def update_user(user_id):
    """Update user profile"""
    # Users can only update their own profile unless admin
    if request.current_user.id != user_id and not request.current_user.is_admin:
        return jsonify({'error': 'Forbidden'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    if 'full_name' in data:
        user.full_name = data['full_name'].strip()
    
    if 'email' in data:
        new_email = data['email'].strip()
        if new_email != user.email and User.query.filter_by(email=new_email).first():
            return jsonify({'error': 'Email already in use'}), 409
        user.email = new_email
    
    # Only admins can change these
    if request.current_user.is_admin:
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'is_active' in data:
            user.is_active = data['is_active']
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict(include_email=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Update failed'}), 500

@users_bp.route('/<int:user_id>/change-password', methods=['POST'])
@token_required
@limiter.limit('30 per minute', key_func=authenticated_user_key)
def change_password(user_id):
    """Change user password"""
    if request.current_user.id != user_id and not request.current_user.is_admin:
        return jsonify({'error': 'Forbidden'}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data or not all(k in data for k in ['old_password', 'new_password']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Verify old password
    if not user.check_password(data['old_password']):
        return jsonify({'error': 'Invalid current password'}), 401
    
    if len(data['new_password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    user.set_password(data['new_password'])
    
    try:
        db.session.commit()
        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Password change failed'}), 500

@users_bp.route('', methods=['GET'])
@token_required
@admin_required
def list_users():
    """List all users (admin only)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    paginated = User.query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        'users': [user.to_dict(include_email=True) for user in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page
    }), 200

@users_bp.route('/<int:user_id>/disable', methods=['POST'])
@token_required
@admin_required
@limiter.limit('30 per minute', key_func=authenticated_user_key)
def disable_user(user_id):
    """Disable user (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_active = False
    
    try:
        db.session.commit()
        return jsonify({'message': 'User disabled successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Operation failed'}), 500

@users_bp.route('/<int:user_id>/enable', methods=['POST'])
@token_required
@admin_required
@limiter.limit('30 per minute', key_func=authenticated_user_key)
def enable_user(user_id):
    """Enable user (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_active = True
    
    try:
        db.session.commit()
        return jsonify({'message': 'User enabled successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Operation failed'}), 500

@users_bp.route('/<int:user_id>/promote', methods=['POST'])
@token_required
@admin_required
@limiter.limit('30 per minute', key_func=authenticated_user_key)
def promote_user(user_id):
    """Promote user to admin (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_admin = True
    
    try:
        db.session.commit()
        return jsonify({'message': 'User promoted to admin'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Operation failed'}), 500

@users_bp.route('/<int:user_id>/demote', methods=['POST'])
@token_required
@admin_required
@limiter.limit('30 per minute', key_func=authenticated_user_key)
def demote_user(user_id):
    """Demote user from admin (admin only)"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_admin = False
    
    try:
        db.session.commit()
        return jsonify({'message': 'User demoted from admin'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Operation failed'}), 500
