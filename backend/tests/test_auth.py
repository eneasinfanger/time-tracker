import pytest
import json

class TestAuth:
    """Authentication tests"""
    
    def test_register_success(self, client, admin_token):
        """Test successful user registration by admin"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.post('/api/auth/register', 
            headers=headers,
            json={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'password123',
                'full_name': 'New User'
            }
        )
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['user']['username'] == 'newuser'
        assert data['user']['email'] == 'new@example.com'
    
    def test_register_non_admin_denied(self, client, auth_token):
        """Test that non-admin cannot register users"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/auth/register',
            headers=headers,
            json={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'password123'
            }
        )
        
        assert response.status_code == 403
    
    def test_register_without_token_denied(self, client):
        """Test that non-authenticated user cannot register"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
    
    def test_register_missing_fields(self, client):
        """Test registration with missing fields"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser'
        })
        
        assert response.status_code == 400
    
    def test_register_short_password(self, client):
        """Test registration with short password"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': '123'
        })
        
        assert response.status_code == 400
    
    def test_register_duplicate_username(self, client, test_user):
        """Test registration with duplicate username"""
        response = client.post('/api/auth/register', json={
            'username': 'testuser',
            'email': 'another@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 409
    
    def test_login_success(self, client, test_user):
        """Test successful login"""
        response = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert data['user']['username'] == 'testuser'
    
    def test_login_invalid_credentials(self, client, test_user):
        """Test login with invalid credentials"""
        response = client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
    
    def test_login_invalid_username(self, client):
        """Test login with non-existent username"""
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password123'
        })
        
        assert response.status_code == 401
    
    def test_verify_token_valid(self, client, auth_token):
        """Test token verification with valid token"""
        response = client.post('/api/auth/verify-token', json={
            'token': auth_token
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['valid'] == True
        assert data['user']['username'] == 'testuser'
    
    def test_verify_token_invalid(self, client):
        """Test token verification with invalid token"""
        response = client.post('/api/auth/verify-token', json={
            'token': 'invalid.token.here'
        })
        
        assert response.status_code == 401
    
    def test_refresh_token(self, client, auth_token):
        """Test token refresh"""
        response = client.post('/api/auth/refresh-token', json={
            'token': auth_token
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert data['token'] != auth_token
