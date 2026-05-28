# ⏱️ Time Tracker - Full Stack Application

A complete time-tracking application built with **Angular 20+** frontend and **Python/Flask** backend. Features user authentication, admin controls, dark/light theme, responsive design, and comprehensive testing.

## 🎯 Features

### Frontend (Angular 20+)
- ✅ **User Authentication**: Secure login and registration with JWT
- ✅ **Dark/Light Theme**: Toggle with persistent storage
- ✅ **Responsive Design**: Mobile-first approach (mobile/tablet/desktop)
- ✅ **Admin Panel**: User management with role controls
- ✅ **Modern Stack**: Signals, standalone components, Tailwind CSS
- ✅ **Form Validation**: Real-time feedback with password strength indicator

### Backend (Python/Flask)
- ✅ **RESTful API**: 15+ endpoints for complete CRUD operations
- ✅ **Authentication**: JWT-based with secure password hashing
- ✅ **Database**: SQLite with optimized schema and indexing
- ✅ **Admin Features**: User promotion/demotion, account management
- ✅ **Activity Tracking**: Create, edit, delete time-tracking entries
- ✅ **Statistics**: Daily activity summaries and time analytics

### Testing & Quality
- ✅ **30+ Unit Tests**: Backend comprehensive test coverage
- ✅ **Integration Tests**: API testing with pytest
- ✅ **Responsive Testing**: Mobile and desktop compatibility verified
- ✅ **Security Testing**: Authentication and authorization checks

## 🏗️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 20+, TypeScript, Signals, Standalone Components |
| **Styling** | Tailwind CSS, Dark Mode Support |
| **State Management** | Angular Signals, Computed, Effects |
| **Backend** | Python 3.8+, Flask, SQLAlchemy |
| **Database** | SQLite with optimized indexes |
| **Authentication** | JWT (HS256), Werkzeug password hashing |
| **Testing** | pytest, Karma, Jasmine |
| **Build** | Angular CLI, Flask CLI |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Git

### Installation

#### 1. Clone and Setup Backend
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create admin user (works even if `flask` isn't on PATH)
python run.py create-admin
# or
python -m flask --app run.py create-admin

# Start backend server
python run.py
# Backend runs on: http://localhost:5000
```

#### 2. Setup Frontend (New Terminal)
```bash
npm install
npm start
# Frontend runs on: http://localhost:4200
```

### Default Access
1. Open http://localhost:4200 in your browser
2. Log in with credentials created via `python run.py create-admin`
3. Click the 🌙/☀️ button to toggle dark mode
4. Visit `/admin` for admin panel (if user is admin)

## 📊 Project Structure

```
time-tracker/
├── backend/                      # Python Flask API
│   ├── app/
│   │   ├── models/              # Database models (User, Activity)
│   │   ├── routes/              # API endpoints (auth, users, activities)
│   │   └── utils/               # Authentication utilities
│   ├── tests/                   # 30+ pytest unit tests
│   ├── config.py               # Configuration management
│   ├── run.py                  # Application entry point
│   └── requirements.txt        # Python dependencies
│
├── src/                         # Angular source
│   ├── app/
│   │   ├── services/           # Auth, Theme, User services
│   │   ├── login/              # Login component
│   │   ├── register/           # Registration component
│   │   ├── admin-panel/        # Admin management
│   │   └── app.routes.ts       # Application routes
│   └── styles.scss             # Global styles
│
├── QUICK_REF.md               # Developer quick reference
├── SETUP.md                   # Setup instructions
├── TESTING.md                 # Testing guide
├── IMPLEMENTATION.md          # Feature implementation details
└── package.json               # Frontend dependencies
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_REF.md](./QUICK_REF.md) | Commands, tips & common workflows |
| [SETUP.md](./SETUP.md) | Installation & environment setup |
| [TESTING.md](./TESTING.md) | Running tests & test coverage |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Feature details & architecture |
| [backend/README.md](./backend/README.md) | Backend API documentation |

## 🔑 Key Features in Detail

### 1. Authentication System
- **Registration**: Email validation, password strength checker
- **Login**: JWT token management, secure storage
- **Admin Controls**: User role management, account enable/disable
- **Password Security**: PBKDF2 hashing via Werkzeug

### 2. Dark/Light Theme
- Toggle button in top-right corner
- Persists to localStorage
- Respects system preference
- Smooth transitions (200ms)
- All components support both themes

### 3. Responsive Design
```
Mobile:   < 640px   (full-stack layout, touch-optimized)
Tablet:   640-1024px (flexible grid)
Desktop:  > 1024px   (multi-column layout)
```

### 4. Admin Panel
- View all users with pagination
- Edit user profiles
- Promote/demote users to/from admin
- Enable/disable user accounts
- Real-time user list updates

### 5. Activity Tracking
- Create time-tracking entries
- Edit and delete activities
- Categorize activities
- View daily statistics
- Track duration automatically

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest -v                    # Run all tests
pytest --cov=app            # With coverage report
pytest tests/test_auth.py   # Specific test file
```

### Frontend Tests
```bash
npm test                     # Run tests
npm test -- --watch=false   # Single run
npm test -- --code-coverage # Coverage report
```

**Test Coverage**: 30+ backend tests, >80% code coverage goal

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register         → Register new user
POST   /api/auth/login            → Login user
POST   /api/auth/verify-token     → Verify JWT token
POST   /api/auth/refresh-token    → Refresh expired token
```

### Users
```
GET    /api/users/<id>            → Get user profile
PUT    /api/users/<id>            → Update profile
POST   /api/users/<id>/change-password   → Change password
GET    /api/users                 → List users (admin only)
POST   /api/users/<id>/promote    → Make user admin
POST   /api/users/<id>/demote     → Remove admin role
POST   /api/users/<id>/disable    → Disable user account
POST   /api/users/<id>/enable     → Enable user account
```

### Activities
```
GET    /api/activities            → List user activities
POST   /api/activities            → Create activity
GET    /api/activities/<id>       → Get specific activity
PUT    /api/activities/<id>       → Update activity
DELETE /api/activities/<id>       → Delete activity
GET    /api/activities/stats/today → Get daily statistics
```

## 🔐 Security

- **Password Hashing**: PBKDF2 via Werkzeug
- **JWT Tokens**: HS256 algorithm, 24-hour expiration
- **CORS Protection**: Configurable allowed origins
- **Role-Based Access**: Admin-only endpoints protected
- **Input Validation**: All endpoints validate input
- **No Plaintext Storage**: Passwords never stored plaintext

## ⚙️ Configuration

### Backend Environment (.env)
```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=http://localhost:4200
```

### Frontend API URL
Update in services (default: `http://localhost:5000`)

## 🎨 Component Architecture

### Frontend Components
- **AppComponent**: Root with theme toggle and router outlet
- **LoginComponent**: Authentication with signal-based state
- **RegisterComponent**: User registration with validation
- **AdminPanelComponent**: User management interface
- **SiteComponent**: Main application (existing)

### Backend Structure
- **Models**: User and Activity database models
- **Routes**: Modular blueprint routes (auth, users, activities)
- **Services**: Authentication and authorization utilities
- **Tests**: Comprehensive pytest fixtures and test suites

## 🐛 Troubleshooting

### CORS Errors
```
Solution: Ensure CORS_ORIGINS in backend .env includes frontend URL
```

### JWT Token Expired
```
Solution: Token refreshes automatically, or manually call /api/auth/refresh-token
```

### Database Errors
```
Solution: Delete backend/time_tracker.db and restart to recreate
```

### Port Already in Use
```
Solution: Change port in run.py (backend) or angular.json (frontend)
```

For more help, see [QUICK_REF.md](./QUICK_REF.md)

## 📈 Performance Optimizations

- **Frontend**:
  - OnPush change detection
  - Signals for reactive state
  - Lazy loaded routes
  - Tailwind CSS optimizations

- **Backend**:
  - Indexed database columns
  - JWT reduces database queries
  - Pagination on list endpoints
  - Connection pooling ready

## 🤝 Contributing

1. Create a branch for features: `git checkout -b feature/feature-name`
2. Write tests for new code
3. Follow Angular and Python style guides
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Useful Links

- [Angular Documentation](https://angular.dev)
- [Flask Documentation](https://flask.palletsprojects.com)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org)
- [JWT Introduction](https://jwt.io)
- [Tailwind CSS](https://tailwindcss.com)

## 💬 Support

For questions or issues:
1. Check [QUICK_REF.md](./QUICK_REF.md)
2. Review [TESTING.md](./TESTING.md)
3. See [IMPLEMENTATION.md](./IMPLEMENTATION.md)
4. Check backend API docs in [backend/README.md](./backend/README.md)

---

**Last Updated**: May 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready

