import os
import sys
from getpass import getpass
from app import create_app, db
from app.models.user import User
from app.models.activity import Activity
from app.models.user_settings import UserSettings

app = create_app(os.getenv('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    """Shell context for Flask CLI"""
    return {'db': db, 'User': User, 'Activity': Activity, 'UserSettings': UserSettings}

@app.cli.command()
def init_db():
    """Initialize database"""
    db.create_all()
    print('Database initialized.')


def _prompt_required(prompt_text):
    """Prompt until the user enters a non-empty value."""
    while True:
        value = input(prompt_text).strip()
        if value:
            return value
        print('Value is required.')


def _create_admin_interactive():
    """Create first admin user with interactive prompts."""
    print('Creating admin user...')
    username = _prompt_required('Username: ')
    email = _prompt_required('Email: ')
    password = getpass('Password: ')

    if not password:
        print('Password is required')
        return

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

@app.cli.command()
def create_admin():
    """Create first admin user"""
    _create_admin_interactive()

if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1].strip().lower()
        with app.app_context():
            if command == 'init-db':
                init_db()
                raise SystemExit(0)
            if command == 'create-admin':
                _create_admin_interactive()
                raise SystemExit(0)

    app.run(
        host='0.0.0.0',
        port=int(os.getenv('FLASK_PORT', 3000)),
        debug=os.getenv('FLASK_DEBUG', True)
    )