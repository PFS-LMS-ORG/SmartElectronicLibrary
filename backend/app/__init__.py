# app/__init__.py
from flask import Flask
from app.db import db
from flask_migrate import Migrate
from app.controllers.book_controller import book_controller  # Import your blueprint
from app.controllers.rental_controller import rental_controller  # Import your blueprint
from app.controllers.user_controller import user_controller  # Import your blueprint


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:@localhost:4306/library_db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)  # Initialize the db
    Migrate(app, db)

    # Register the blueprint
    app.register_blueprint(book_controller)
    app.register_blueprint(rental_controller)  # Register the rental controller
    app.register_blueprint(user_controller)  # Register the user controller

    return app
