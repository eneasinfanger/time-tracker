import pytest
from app import create_app, db
from app.models.user import User
from app.models.activity import Activity

@pytest.fixture
def app():
    """Create application for the tests"""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Test client"""
    return app.test_client()

@pytest.fixture
def runner(app):
    """CLI runner"""
    return app.test_cli_runner()

@pytest.fixture
def test_user(app):
    """Create test user"""
    user = User(
        username='testuser',
        email='test@example.com',
        full_name='Test User'
    )
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def test_admin(app):
    """Create test admin user"""
    admin = User(
        username='admin',
        email='admin@example.com',
        full_name='Admin User',
        is_admin=True
    )
    admin.set_password('admin123')
    db.session.add(admin)
    db.session.commit()
    return admin

@pytest.fixture
def auth_token(client, test_user):
    """Get auth token for test user"""
    response = client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })
    return response.get_json()['token']

@pytest.fixture
def admin_token(client, test_admin):
    """Get auth token for admin user"""
    response = client.post('/auth/login', json={
        'username': 'admin',
        'password': 'admin123'
    })
    return response.get_json()['token']
