# Installation & Setup Guide

## Quick Start

### Backend Setup

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Create and Activate Virtual Environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate
   
   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the Backend Server**
   ```bash
   python app.py
   ```
   
   The API will run on `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm start
   ```
   
   The app will run on `http://localhost:4200`

## Authentication

The application requires authentication to access most features:

1. **Create Admin User** (Run once):
   ```bash
   cd backend
   python run.py create-admin
   # or
   python -m flask --app run.py create-admin
   ```
   Follow the prompts to set username, email, and password.

2. **Log In**: Use the admin credentials to log in to the application.

3. **Create New Users**: Only admins can create new user accounts through the admin panel at `/admin`.

## Testing

### Backend Tests
```bash
cd backend
pytest -v
```

### Frontend Tests
```bash
npm test
```

## Environment Configuration

### Backend (.env file)
```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///time_tracker.db
JWT_SECRET_KEY=your-jwt-secret
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=http://localhost:4200
```

## Default Admin User

After setting up the backend, create an admin user:

```bash
cd backend
python run.py create-admin
```

Then log in with those credentials in the frontend.

## Access Control

- **Login & Home**: All users can access after logging in
- **Admin Panel** (`/admin`): Only admin users can access
- **User Registration**: Only admins can create new users via `/admin` or `/register` endpoint

## Troubleshooting

### CORS Issues
If you see CORS errors, make sure:
1. Backend is running on `http://localhost:5000`
2. Frontend is running on `http://localhost:4200`
3. CORS_ORIGINS in backend .env includes `http://localhost:4200`

### Authentication Issues
- You must be logged in to use the application
- Non-admin users cannot access the admin panel
- Only admins can create new user accounts

### Database Issues
If you see database errors:
```bash
cd backend
rm time_tracker.db  # Delete old database
python app.py      # Recreate it
```

### Port Already in Use
Change the port in app.py (default 5000) or frontend (default 4200)

