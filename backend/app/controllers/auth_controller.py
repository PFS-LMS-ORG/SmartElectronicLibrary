# backend/app/controllers/auth_controller.py

import os
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from app.db import db
from app.model.User import User
from app.model.AccountRequest import AccountRequest
from app.services.UserService import UserService
from app.services.NotificationService import NotificationService
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging
from app.services.EmailService import EmailService

# Initialize EmailService
email_service = EmailService()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Bcrypt
bcrypt = Bcrypt()

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        logger.debug("Received login request: %s", request.get_json())
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            logger.warning("Missing email or password")
            return jsonify({'message': 'Email and password are required'}), 400

        # Check if the email exists in pending account requests
        pending_request = AccountRequest.query.filter_by(email=email, status='pending').first()
        if pending_request:
            logger.warning("Login attempt for pending account: %s", email)
            return jsonify({'message': 'Your account is pending admin approval'}), 403

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            logger.warning("Invalid credentials for email: %s", email)
            return jsonify({'message': 'Invalid email or password'}), 401
        access_token = create_access_token(identity=str(user.id))
        logger.debug("Generated token for user %s: %s", user.id, access_token)
        
        is_first_login = user.login_count == 0
        
        if is_first_login:
            # Create a welcome notification for the user
            NotificationService.create_notification(
                user_id=user.id,
                type='welcome',
                message='Welcome to LMSENSA+! Your registration has been approved.'
            )
        
        # Update login count regardless of whether it's first login
        user.login_count += 1
        db.session.commit()
        
        return jsonify({
            'access_token': access_token,
            'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}
        }), 200
    except Exception as e:
        logger.error("Login error: %s", str(e))
        return jsonify({'message': 'Server error during login'}), 500



@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        logger.debug("Received register request: %s", request.get_json())
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not all([name, email, password]):
            logger.warning("Missing required fields")
            return jsonify({'message': 'Missing required fields'}), 400

        if User.query.filter_by(email=email).first() or AccountRequest.query.filter_by(email=email).first():
            logger.warning("Email already registered or requested: %s", email)
            return jsonify({'message': 'Email already registered or requested'}), 400

        # Hash the password using Bcrypt
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        account_request = UserService.create_account_request(name, email, hashed_password)
        if not account_request:
            return jsonify({'message': 'Email already requested'}), 400
        
        # Find all admin users
        admin_users = User.query.filter_by(role='admin').all()
        
        # Create notification for each admin
        for admin in admin_users:
            # Create a notification for the admin
            NotificationService.create_notification(
                user_id=admin.id,
                type='info',
                message=f'New user registration: {name} ({email}) is waiting for approval.'
            )
            
            

        # Send registration email using service token
        # -----------------------------------------------------------------------------------------
        result = email_service.send_email(
            email, 
            'registration', 
            {'userName': name, 'action': 'register'}
        )
        if not result['success']:
            logger.error("Failed to send registration email: %s", result['message'])
        # -----------------------------------------------------------------------------------------

        logger.debug("Account request created for: %s", email)
        return jsonify({
            'message': 'Account request submitted. Awaiting admin approval.',
            'request_id': account_request.id
        }), 201
    except Exception as e:
        logger.error("Register error: %s", str(e))
        return jsonify({'message': 'Server error during registration'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    try:
        user_id = get_jwt_identity()
        logger.debug("Fetching user with ID: %s", user_id)
        user = User.query.get(int(user_id))
        if not user:
            logger.warning("User not found: %s", user_id)
            return jsonify({'message': 'User not found'}), 404
        logger.debug("User fetched: %s", user.email)
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }), 200
    except Exception as e:
        logger.error("Error fetching user: %s", str(e))
        return jsonify({'message': 'Server error'}), 500