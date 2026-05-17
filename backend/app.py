import os
from app import create_app, db
from app.models.user import User
from app.models.activity import Activity

app = create_app(os.getenv('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    """Shell context for Flask CLI"""
    return {'db': db, 'User': User, 'Activity': Activity}

@app.cli.command()
def init_db():
    """Initialize database"""
    db.create_all()
    print('Database initialized.')

@app.cli.command()
def create_admin():
    """Create first admin user"""
    print('Creating admin user...')
    username = input('Username: ')
    email = input('Email: ')
    password = input('Password: ')
    
    if User.query.filter_by(username=username).first():
        print(f'User {username} already exists')
        return
    
    admin = User(
        username=username,
        email=email,
        full_name='Administrator',
        is_admin=True
    )
    admin.set_password(password)
    
    db.session.add(admin)
    db.session.commit()
    print(f'Admin user {username} created successfully')

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', True)
    )
