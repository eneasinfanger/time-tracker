# Time Tracker Backend - Python Flask API

Complete RESTful API backend for the Time Tracker application using Flask, SQLAlchemy, and SQLite.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **User Management**: User profiles, registration, login, password changes
- **Admin Controls**: User management, role promotion/demotion, account disabling
- **Activity Tracking**: Create, update, delete, and retrieve time-tracking activities
- **Statistics**: Daily activity statistics and time summaries
- **Security**: CORS protection, JWT token validation, password hashing with Werkzeug

## Project Structure

```
backend/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── models/
│   │   ├── user.py             # User model with authentication
│   │   └── activity.py         # Activity/Task model
│   ├── routes/
│   │   ├── auth.py             # Authentication endpoints
│   │   ├── users.py            # User management endpoints
│   │   └── activities.py       # Activity management endpoints
│   └── utils/
│       └── auth.py             # JWT and auth utilities
├── tests/
│   ├── conftest.py            # Test fixtures
│   ├── test_auth.py           # Authentication tests
│   ├── test_users.py          # User management tests
│   └── test_activities.py     # Activity tests
├── config.py                   # Configuration management
├── run.py                      # Application entry point
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (dev)
└── .env.example                # Environment template
```

## Installation

### Prerequisites
- Python 3.8+
- pip or poetry

### Setup Steps

1. **Create Virtual Environment**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   # Copy example to .env
   cp .env.example .env
   
   # Update .env with your configuration
   ```

4. **Initialize Database**
   ```bash
   flask shell
   >>> from app import db, create_app
   >>> app = create_app()
   >>> with app.app_context():
   >>>     db.create_all()
   >>> exit()
   ```

5. **Create Admin User**
   ```bash
   python run.py create-admin

   # Alternative Flask CLI invocation (no global `flask` executable required)
   python -m flask --app run.py create-admin
   ```

## Running the Application

### Development Mode
```bash
python run.py
```

The API will be available at `http://localhost:5000`

### Production Mode
```bash
export FLASK_ENV=production
gunicorn --workers 4 --bind 0.0.0.0:5000 run:app
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/refresh-token` - Refresh JWT token

### Users
- `GET /api/users/<id>` - Get user profile
- `PUT /api/users/<id>` - Update user profile
- `POST /api/users/<id>/change-password` - Change password
- `GET /api/users` - List all users (admin only)
- `POST /api/users/<id>/disable` - Disable user (admin only)
- `POST /api/users/<id>/enable` - Enable user (admin only)
- `POST /api/users/<id>/promote` - Promote to admin (admin only)
- `POST /api/users/<id>/demote` - Demote from admin (admin only)

### Activities
- `GET /api/activities` - Get user's activities
- `POST /api/activities` - Create new activity
- `GET /api/activities/<id>` - Get specific activity
- `PUT /api/activities/<id>` - Update activity
- `DELETE /api/activities/<id>` - Delete activity
- `GET /api/activities/stats/today` - Get today's statistics

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Token Payload
```json
{
  "user_id": 1,
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Testing

Run the test suite:

```bash
pytest
```

Run tests with coverage:

```bash
pytest --cov=app tests/
```

Run specific test file:

```bash
pytest tests/test_auth.py -v
```

## Environment Variables

```env
FLASK_ENV=development              # development, production, testing
FLASK_DEBUG=True                  # Enable debug mode
SECRET_KEY=your-secret-key        # Flask secret key
DATABASE_URL=sqlite:///time_tracker.db  # Database URL
JWT_SECRET_KEY=your-jwt-secret    # JWT signing key
JWT_ALGORITHM=HS256               # JWT algorithm
JWT_EXPIRATION_HOURS=24           # Token expiration in hours
CORS_ORIGINS=http://localhost:4200  # Allowed CORS origins
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW()
);
```

### Activities Table
```sql
CREATE TABLE activities (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL FOREIGN KEY,
  task_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_minutes INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW()
);
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (Admin only)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate username)
- `500` - Server Error

## Security Considerations

1. **Password Security**: Passwords are hashed using Werkzeug's `generate_password_hash`
2. **JWT Tokens**: Signed with a secret key and include expiration
3. **CORS**: Configured to accept requests only from specified origins
4. **Admin Access**: Protected endpoints require admin privileges
5. **Token Validation**: All protected routes validate token before access

## Performance Optimization

- Database queries use indexes on frequently searched fields
- Pagination support on list endpoints
- JWT tokens reduce database queries for authentication
- Efficient filtering and sorting capabilities

## Deployment

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "run.py"]
```

### Cloud Platforms
- **Heroku**: Use Procfile with gunicorn
- **AWS**: Deploy with ElasticBeanstalk or EC2
- **Google Cloud**: Cloud Run or App Engine
- **Azure**: App Service

## License

MIT License - See LICENSE file for details
