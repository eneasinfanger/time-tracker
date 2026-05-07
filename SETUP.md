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
   python run.py
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
flask create-admin
```

Then log in with those credentials in the frontend.

## Troubleshooting

### CORS Issues
If you see CORS errors, make sure:
1. Backend is running on `http://localhost:5000`
2. Frontend is running on `http://localhost:4200`
3. CORS_ORIGINS in backend .env includes `http://localhost:4200`

### Database Issues
If you see database errors:
```bash
cd backend
rm time_tracker.db  # Delete old database
python run.py      # Recreate it
```

### Port Already in Use
Change the port in run.py (default 5000) or frontend (default 4200)
