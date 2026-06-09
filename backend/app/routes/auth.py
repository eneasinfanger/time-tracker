from flask import Blueprint, request, jsonify
from app import db, limiter
from app.models.user import User
from app.utils.auth import generate_jwt_token, verify_jwt_token, get_token_from_request
from app.utils.rate_limit import remote_address_key

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/register', methods=['POST'])
@limiter.limit('20 per hour', key_func=remote_address_key)
def register():
    """Register a new user (admin only)"""
    data = request.get_json()
    
    # Validation
    if not data or not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409

    token = get_token_from_request()
    if not token:
        return jsonify({'error': 'Missing authorization token'}), 401

    payload = verify_jwt_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401

    user = User.query.get(payload['user_id'])
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401

    if not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    # Create new user
    new_user = User(
        username=username,
        email=email,
        full_name=full_name or username
    )
    new_user.set_password(password)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict(include_email=True)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
@limiter.limit('60 per minute', key_func=remote_address_key)
def login():
    """Login user"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ['username', 'password']):
        return jsonify({'error': 'Missing username or password'}), 400
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'User account is disabled'}), 403
    
    token = generate_jwt_token(user.id)
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict(include_email=True)
    }), 200

@auth_bp.route('/verify-token', methods=['POST'])
@limiter.limit('60 per minute', key_func=remote_address_key)
def verify_token():
    """Verify JWT token"""
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'Missing token'}), 400
    
    payload = verify_jwt_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.get(payload['user_id'])
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    return jsonify({
        'valid': True,
        'user': user.to_dict(include_email=True)
    }), 200

@auth_bp.route('/refresh-token', methods=['POST'])
@limiter.limit('60 per minute', key_func=remote_address_key)
def refresh_token():
    """Refresh JWT token"""
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'Missing token'}), 400
    
    payload = verify_jwt_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.get(payload['user_id'])
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    new_token = generate_jwt_token(user.id)
    return jsonify({
        'token': new_token,
        'user': user.to_dict(include_email=True)
    }), 200
