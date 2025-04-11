# app/__init__.py
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from app.db import db
from flask_migrate import Migrate
from app.controllers.book_controller import book_controller
from app.controllers.auth_controller import auth_bp  # Import auth blueprint
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()  # Load environment variables from .env

    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')  # For JWT
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')  # Separate key for JWT

    db.init_app(app)
    Bcrypt(app)  # Initialize Bcrypt
    JWTManager(app)  # Initialize JWTManager
    Migrate(app, db)

    # Register blueprints
    app.register_blueprint(book_controller)
    app.register_blueprint(auth_bp, url_prefix='/auth')  # Register auth blueprint

    return app