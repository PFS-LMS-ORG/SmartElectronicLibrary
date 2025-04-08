# app/__init__.py
from flask import Flask
from app.db import db
from flask_migrate import Migrate
from app.controllers.book_controller import book_controller  # Import your blueprint


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost:4306/library_db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)  # Initialize the db
    Migrate(app, db)

    # Register the blueprint
    app.register_blueprint(book_controller)

    return app
