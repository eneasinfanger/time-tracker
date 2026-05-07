import pytest
from datetime import datetime, timedelta
from app import db
from app.models.activity import Activity

class TestActivities:
    """Activity management tests"""
    
    def test_create_activity(self, client, test_user, auth_token):
        """Test creating new activity"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/activities', headers=headers, json={
            'task_name': 'Test Task',
            'description': 'Test Description',
            'category': 'Work'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['activity']['task_name'] == 'Test Task'
        assert data['activity']['category'] == 'Work'
    
    def test_create_activity_missing_task_name(self, client, auth_token):
        """Test creating activity without task name"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/activities', headers=headers, json={
            'description': 'Test Description'
        })
        
        assert response.status_code == 400
    
    def test_get_activities(self, client, test_user, auth_token, app):
        """Test getting user's activities"""
        # Create test activity
        activity = Activity(
            user_id=test_user.id,
            task_name='Test Activity',
            start_time=datetime.utcnow()
        )
        db.session.add(activity)
        db.session.commit()
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/activities', headers=headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['activities']) > 0
        assert data['activities'][0]['task_name'] == 'Test Activity'
    
    def test_get_activity(self, client, test_user, auth_token, app):
        """Test getting specific activity"""
        activity = Activity(
            user_id=test_user.id,
            task_name='Test Activity',
            start_time=datetime.utcnow()
        )
        db.session.add(activity)
        db.session.commit()
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/api/activities/{activity.id}', headers=headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['task_name'] == 'Test Activity'
    
    def test_get_activity_forbidden(self, client, test_user, app, auth_token):
        """Test getting other user's activity"""
        from app.models.user import User
        
        other_user = User(
            username='otheruser',
            email='other@example.com'
        )
        other_user.set_password('password123')
        db.session.add(other_user)
        db.session.commit()
        
        activity = Activity(
            user_id=other_user.id,
            task_name='Other Activity',
            start_time=datetime.utcnow()
        )
        db.session.add(activity)
        db.session.commit()
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/api/activities/{activity.id}', headers=headers)
        
        assert response.status_code == 403
    
    def test_update_activity(self, client, test_user, auth_token, app):
        """Test updating activity"""
        activity = Activity(
            user_id=test_user.id,
            task_name='Original Task',
            start_time=datetime.utcnow()
        )
        db.session.add(activity)
        db.session.commit()
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        end_time = datetime.utcnow() + timedelta(hours=1)
        response = client.put(f'/api/activities/{activity.id}',
            headers=headers,
            json={
                'task_name': 'Updated Task',
                'is_completed': True,
                'end_time': end_time.isoformat()
            }
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['activity']['task_name'] == 'Updated Task'
        assert data['activity']['is_completed'] == True
    
    def test_delete_activity(self, client, test_user, auth_token, app):
        """Test deleting activity"""
        activity = Activity(
            user_id=test_user.id,
            task_name='To Delete',
            start_time=datetime.utcnow()
        )
        db.session.add(activity)
        db.session.commit()
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.delete(f'/api/activities/{activity.id}', headers=headers)
        
        assert response.status_code == 200
        
        # Verify it's deleted
        check_response = client.get(f'/api/activities/{activity.id}', headers=headers)
        assert check_response.status_code == 404
    
    def test_get_today_stats(self, client, test_user, auth_token, app):
        """Test getting today's statistics"""
        activity = Activity(
            user_id=test_user.id,
            task_name='Today Task',
            start_time=datetime.utcnow(),
            duration_minutes=60,
            is_completed=True
        )
        db.session.add(activity)
        db.session.commit()
        
        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get('/api/activities/stats/today', headers=headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['total_activities'] > 0
        assert data['total_minutes'] > 0
