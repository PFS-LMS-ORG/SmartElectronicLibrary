# app/__init__.py
from flask import Flask
from app.db import db
from flask_migrate import Migrate
from app.controllers.book_controller import book_controller
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()  # Load environment variables from .env

    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    Migrate(app, db)

    app.register_blueprint(book_controller)

    return app
