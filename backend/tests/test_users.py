import pytest
from app import db
from app.models.user import User
from app.models.user_settings import UserSettings


class TestUsers:
    """User management tests"""

    def test_get_user_own_profile(self, client, test_user, auth_token):
        """Test getting own user profile"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/users/{test_user.id}', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'

    def test_get_user_other_profile_forbidden(self, client, test_user, app, auth_token):
        """Test getting other user's profile without admin"""
        other_user = User(
            username='otheruser',
            email='other@example.com'
        )
        other_user.set_password('password123')
        db.session.add(other_user)
        db.session.commit()

        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/users/{other_user.id}', headers=headers)

        assert response.status_code == 403

    def test_update_user_profile(self, client, test_user, auth_token):
        """Test updating user profile"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.put(
            f'/users/{test_user.id}',
            headers=headers,
            json={
                'full_name': 'Updated Name',
                'email': 'newemail@example.com'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['user']['full_name'] == 'Updated Name'
        assert data['user']['email'] == 'newemail@example.com'

    def test_change_password(self, client, test_user, auth_token):
        """Test changing password"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post(
            f'/users/{test_user.id}/change-password',
            headers=headers,
            json={
                'old_password': 'password123',
                'new_password': 'newpassword123'
            }
        )

        assert response.status_code == 200

        # Try logging in with new password
        login_response = client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'newpassword123'
        })

        assert login_response.status_code == 200

    def test_change_password_invalid_old(self, client, test_user, auth_token):
        """Test changing password with invalid old password"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post(
            f'/users/{test_user.id}/change-password',
            headers=headers,
            json={
                'old_password': 'wrongpassword',
                'new_password': 'newpassword123'
            }
        )

        assert response.status_code == 401

    def test_list_users_admin_only(self, client, admin_token):
        """Test listing users (admin only)"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.get('/users', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert 'users' in data
        assert 'total' in data

    def test_list_users_non_admin(self, client, auth_token):
        """Test listing users without admin access"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/users', headers=headers)

        assert response.status_code == 403

    def test_disable_user(self, client, test_user, app, admin_token):
        """Test disabling user (admin)"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.post(f'/users/{test_user.id}/disable', headers=headers)

        assert response.status_code == 200

        # Try logging in with disabled user
        login_response = client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })

        assert login_response.status_code == 403

    def test_promote_user(self, client, test_user, admin_token):
        """Test promoting user to admin"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.post(f'/users/{test_user.id}/promote', headers=headers)

        assert response.status_code == 200

    def test_demote_user(self, client, test_user, admin_token):
        """Test demoting user from admin"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = client.post(f'/users/{test_user.id}/demote', headers=headers)

        assert response.status_code == 200

    def test_get_current_user_settings_defaults(self, client, auth_token):
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/users/me/settings', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['settings']['enableTasks'] is True
        assert data['settings']['theme'] == 'system'
        assert data['settings']['durationThreshold']['weeks'] == 1
        assert data['settings']['issueTrackerSources'] == []

    def test_update_current_user_settings(self, client, test_user, auth_token):
        headers = {'Authorization': f'Bearer {auth_token}'}
        payload = {
            'settings': {
                'alwaysShownActivities': [{'id': '1', 'description': 'Review', 'task': 'LAB-1'}],
                'durationThreshold': {'weeks': 2, 'days': 1, 'hours': 0, 'minutes': 30},
                'enableTasks': False,
                'theme': 'dark',
                'issueTrackerSources': [{'name': 'Main', 'url': 'https://jira.example.com', 'projects': ['LAB']}],
            }
        }
        response = client.put('/users/me/settings', headers=headers, json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data['settings']['theme'] == 'dark'
        assert data['settings']['enableTasks'] is False

        settings_row = UserSettings.query.filter_by(user_id=test_user.id).first()
        assert settings_row is not None
        assert settings_row.theme == 'dark'
        assert settings_row.enable_tasks is False
        assert settings_row.duration_weeks == 2
        assert len(settings_row.always_shown_activities) == 1
        assert len(settings_row.issue_tracker_sources) == 1

    def test_update_current_user_settings_requires_object(self, client, auth_token):
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.put('/users/me/settings', headers=headers, json={'settings': []})

        assert response.status_code == 400
