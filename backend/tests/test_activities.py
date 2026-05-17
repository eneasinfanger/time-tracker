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

    def test_get_day_summary(self, client, test_user, auth_token, app):
        today = datetime.utcnow().date()
        morning = datetime.combine(today, datetime.strptime('09:00', '%H:%M').time())
        afternoon = datetime.combine(today, datetime.strptime('11:00', '%H:%M').time())
        late_morning = datetime.combine(today, datetime.strptime('10:00', '%H:%M').time())
        noon = datetime.combine(today, datetime.strptime('12:00', '%H:%M').time())

        first = Activity(
            user_id=test_user.id,
            task_name='Task A',
            description='Planning',
            start_time=morning,
            end_time=afternoon,
            duration_minutes=120,
            is_completed=True,
        )
        second = Activity(
            user_id=test_user.id,
            task_name='Task B',
            description='Planning',
            start_time=late_morning,
            end_time=noon,
            duration_minutes=120,
            is_completed=True,
        )
        db.session.add_all([first, second])
        db.session.commit()

        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.get(f'/api/activities/day/{today.isoformat()}', headers=headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data['summary']['byDescription'][0]['key'] == 'Planning'
        assert data['summary']['byDescription'][0]['totalMinutes'] == 240
        assert data['summary']['byTask'][0]['totalMinutes'] == 120

    def test_get_description_suggestions(self, client, test_user, auth_token, app):
        today = datetime.utcnow().date()
        activity = Activity(
            user_id=test_user.id,
            task_name='ABC-1',
            description='Build backend',
            start_time=datetime.combine(today, datetime.strptime('08:00', '%H:%M').time()),
            end_time=datetime.combine(today, datetime.strptime('09:00', '%H:%M').time()),
            duration_minutes=60,
            is_completed=True,
        )
        db.session.add(activity)
        db.session.commit()

        headers = {'Authorization': f'Bearer {auth_token}'}
        response = client.post('/api/activities/suggestions', headers=headers, json={
            'date': today.isoformat(),
            'field': 'description',
            'value': 'Build backend',
            'activityType': 'activity',
            'durationThreshold': {'weeks': 1, 'days': 0, 'hours': 0, 'minutes': 0},
            'alwaysShownActivities': [],
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['suggestions'] == []

    def test_get_start_and_end_suggestions(self, client, auth_token):
        today = datetime.utcnow().date().isoformat()
        current_activities = [
            {
                'id': '1',
                'startTime': '08:00',
                'endTime': '09:00',
                'description': 'First',
                'task': 'TASK-1',
                'type': 'activity',
            },
            {
                'id': '2',
                'startTime': '09:30',
                'endTime': '10:15',
                'description': 'Current',
                'task': 'TASK-2',
                'type': 'activity',
            },
            {
                'id': '3',
                'startTime': '10:30',
                'endTime': '11:00',
                'description': 'Last',
                'task': 'TASK-3',
                'type': 'activity',
            },
        ]
        headers = {'Authorization': f'Bearer {auth_token}'}

        start_response = client.post('/api/activities/suggestions', headers=headers, json={
            'date': today,
            'field': 'start',
            'currentActivityId': '2',
            'currentActivities': current_activities,
        })
        end_response = client.post('/api/activities/suggestions', headers=headers, json={
            'date': today,
            'field': 'end',
            'currentActivityId': '2',
            'currentActivities': current_activities,
        })

        assert start_response.status_code == 200
        assert end_response.status_code == 200
        assert start_response.get_json()['suggestions'] == ['09:00']
        assert end_response.get_json()['suggestions'] == ['10:30']
