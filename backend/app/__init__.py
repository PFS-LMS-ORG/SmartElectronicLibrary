from flask import Flask
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from app.db import db
from flask_migrate import Migrate
from app.controllers.book_controller import book_controller
from app.controllers.rental_request_controller import rental_request_controller
from app.controllers.auth_controller import auth_bp
from app.controllers.user_controller import user_controller
from app.controllers.rental_controller import rental_controller
from app.controllers.account_requests_controller import account_requests_bp
from app.controllers.chatbot_controller import chatbot_controller
from app.controllers.article_controller import article_controller
from dotenv import load_dotenv
import os
import logging


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_app():
    logger.debug("Loading environment variables")
    load_dotenv()
    logger.debug("Creating Flask app")
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

    logger.debug("Initializing extensions")
    db.init_app(app)
    Bcrypt(app)
    JWTManager(app)
    Migrate(app, db)

    logger.debug("Registering blueprints")
    app.register_blueprint(book_controller)
    app.register_blueprint(rental_request_controller)
    app.register_blueprint(user_controller)
    app.register_blueprint(rental_controller)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(account_requests_bp, url_prefix='/admin')
    app.register_blueprint(chatbot_controller, url_prefix='/chatbot')
    app.register_blueprint(article_controller)

    logger.debug("App creation complete")
    return app