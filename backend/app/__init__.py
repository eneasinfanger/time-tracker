from flask import Flask, jsonify, send_from_directory, Blueprint
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from config import config

db = SQLAlchemy()
limiter = Limiter(key_func=get_remote_address, default_limits=[])

def create_app(config_name=None):
    """Application factory"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    ANGULAR_DIST_DIR = os.getenv('ANGULAR_DIST_DIR')

    app = Flask(
      __name__,
      static_folder=ANGULAR_DIST_DIR
    )
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    CORS(app,
         origins=app.config['CORS_ORIGINS'],
         allow_headers=['Content-Type', 'Authorization'],
         expose_headers=['Content-Type'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    limiter.init_app(app)

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({'error': 'Too many requests'}), 429

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.activities import activities_bp
    from app.models import User, Activity, UserSettings

    api_bp = Blueprint('api', __name__, url_prefix='/api')

    api_bp.register_blueprint(auth_bp, )
    api_bp.register_blueprint(users_bp)
    api_bp.register_blueprint(activities_bp)

    app.register_blueprint(api_bp)

    if ANGULAR_DIST_DIR:
      #print(f"Serving Angular app from {ANGULAR_DIST_DIR}")

      @app.route("/", defaults={"path": ""})
      @app.route("/<path:path>")
      def serve_angular(path):
        # print(f"Request for path: {path}")
        # If the requested path corresponds to an existing static file (js, css, images), serve it
        if path != "" and os.path.isfile(os.path.join(app.static_folder, path)):
          return send_from_directory(app.static_folder, path)
        # Otherwise, fall back to index.html so Angular client router handles it
        return send_from_directory(app.static_folder, "index.html")

    # Create tables
    with app.app_context():
        db.create_all()

    return app
