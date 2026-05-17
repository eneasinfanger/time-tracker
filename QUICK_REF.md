# Time Tracker - Developer Quick Reference

## 🚀 Quick Start Commands

### First Time Setup
```bash
# Clone/enter repository
cd time-tracker

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Create admin user (run once)
flask create-admin

# Start backend (localhost:5000)
python app.py

# In another terminal - Setup frontend
npm install
npm start  # localhost:4200
```

## 📋 Common Tasks

### Backend Development

```bash
# Run tests
cd backend
pytest -v                    # All tests
pytest --cov=app            # With coverage
pytest tests/test_auth.py   # Specific file

# Create admin user
flask create-admin

# Database shell
flask shell

# Run specific config
export FLASK_ENV=development && python app.py
```

### Frontend Development

```bash
# Build
npm run build

# Run tests
npm test
npm test -- --watch=false   # Single run

# Code coverage
npm test -- --code-coverage

# Lint code
npm lint
```

### Docker Development

```bash
# Build images
docker-compose build

# Start services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔑 Important Passwords & Keys

### Development Credentials
- **Username**: (created via `flask create-admin`)
- **API Base**: `http://localhost:5000`
- **Frontend**: `http://localhost:4200`
- **Note**: Only admins can create new users

### Default Admin Creation
When running `flask create-admin`:
- Username: (custom)
- Email: (custom)
- Password: (custom)

### JWT Configuration
- **Algorithm**: HS256
- **Expiration**: 24 hours (configurable)
- **Location**: Authorization header as `Bearer <token>`

## 📁 Key Files

### Backend
- `backend/app.py` - Entry point (formerly run.py)
- `backend/config.py` - Configuration
- `backend/app/models/` - Database models
- `backend/app/routes/` - API endpoints
- `backend/app/utils/auth.py` - Authentication
- `backend/tests/` - Test suite

### Frontend
- `src/app/app.component.ts` - Root component
- `src/app/app.routes.ts` - Routes
- `src/app/guards/auth.guard.ts` - Auth guards
- `src/app/services/` - Services
- `src/app/login/` - Login component
- `src/app/register/` - Registration component
- `src/app/admin-panel/` - Admin panel

## 🔧 Configuration

### Backend .env
```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret
JWT_SECRET_KEY=your-jwt-secret
CORS_ORIGINS=http://localhost:4200
```

### Frontend API Base
Edit services to change backend URL from `http://localhost:5000`

## 📊 API Endpoints Summary

### Auth
- `POST /api/auth/register` - Register user (admin only)
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-token` - Verify JWT
- `POST /api/auth/refresh-token` - Refresh JWT

### Users
- `GET /api/users/<id>` - Get profile
- `PUT /api/users/<id>` - Update profile
- `POST /api/users/<id>/change-password` - Change password
- `GET /api/users` - List (admin only)
- `POST /api/users/<id>/promote` - Make admin
- `POST /api/users/<id>/demote` - Remove admin

### Activities
- `GET /api/activities` - List
- `POST /api/activities` - Create
- `GET /api/activities/<id>` - Get
- `PUT /api/activities/<id>` - Update
- `DELETE /api/activities/<id>` - Delete
- `GET /api/activities/stats/today` - Daily stats

## 🐛 Debugging

### Backend
```python
# Add to code for debugging
import pdb; pdb.set_trace()

# Run with debugging
python -m pdb app.py
```

### Frontend
- F12 to open DevTools
- Use Angular DevTools extension
- Check Network tab for API calls

### Common Issues

**CORS Error**:
- Check CORS_ORIGINS in backend .env
- Make sure backend is running on :5000
- Frontend on :4200

**JWT Token Error**:
- Token may be expired, refresh at /api/auth/refresh-token
- Check token stored in localStorage

**Authentication Error**:
- You must log in first
- Admins only can access /admin
- Admins only can create users

**Database Error**:
- Delete `backend/time_tracker.db`
- Restart backend to recreate
- Run `flask create-admin` again

## 📈 Performance Tips

1. **Backend**:
   - Use pagination: `?page=1&per_page=20`
   - Indexes on frequently queried columns
   - JWT reduces database hits

2. **Frontend**:
   - Signals for reactive state
   - OnPush change detection
   - Lazy load routes
   - AOT compilation in production

## 🧪 Testing Workflow

```bash
# 1. Write test
vim backend/tests/test_feature.py

# 2. Run test (will fail)
pytest tests/test_feature.py

# 3. Write code to pass test
# 4. Run all tests
pytest -v --cov=app

# 5. Check coverage
# (should be >80%)
```

## 📦 Dependencies

### Backend
```
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
PyJWT==2.9.0
python-dotenv==1.0.0
```

### Frontend
```
@angular/core
@angular/common
@angular/forms
rxjs
```

## 🔒 Security Checklist

- [ ] Never commit .env with real secrets
- [ ] Use strong JWT_SECRET_KEY
- [ ] Enable HTTPS in production
- [ ] Validate all inputs
- [ ] Hash passwords (done via Werkzeug)
- [ ] Check user authorization
- [ ] Use CORS properly
- [ ] Only admins can create users

## 📚 Documentation

- [Backend README](./backend/README.md)
- [Setup Guide](./SETUP.md)
- [Testing Guide](./TESTING.md)
- [Implementation Summary](./IMPLEMENTATION.md)

## 🎯 Common Workflows

### Adding New Endpoint

1. Create route in `backend/app/routes/new_feature.py`
2. Register in `backend/app/__init__.py`
3. Create tests in `backend/tests/test_new_feature.py`
4. Run tests: `pytest -v`
5. Create frontend service
6. Use service in component

### Adding New Component

1. Generate: `ng generate component feature`
2. Add route to `app.routes.ts`
3. Add guards if needed
4. Inject service in component
5. Create template with signals
6. Add tests
7. Run: `npm test`

## 💡 Tips & Tricks

- Use `flask shell` to interact with database directly
- Print tokens to console to decode at jwt.io
- Use Chrome DevTools to inspect network requests
- Set `FLASK_DEBUG=True` for auto-reload
- Use `npm run build` to create production build
- Test on mobile using `http://<your-ip>:4200`
- Only admins can access /admin and create users

## 📞 Need Help?

1. Check error messages in browser console
2. Check backend logs (terminal)
3. Run tests: `pytest -v`
4. Review [TESTING.md](./TESTING.md)
5. Check [IMPLEMENTATION.md](./IMPLEMENTATION.md)
6. Verify authentication status

