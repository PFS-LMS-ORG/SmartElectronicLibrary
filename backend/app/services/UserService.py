from app.model.User import User
from app.model.AccountRequest import AccountRequest
from app.db import db
from datetime import datetime

class UserService:
    @staticmethod
    def get_all_users():
        return User.query.all()

    @staticmethod
    def get_user_by_id(user_id):
        return User.query.get(user_id)

    @staticmethod
    def get_user_by_email(email):
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create_user(name, email, role='user'):
        new_user = User(name=name, email=email, role=role)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def update_user(user_id, name=None, email=None, role=None):
        user = User.query.get(user_id)
        if not user:
            return None
        if name:
            user.name = name
        if email:
            user.email = email
        if role:
            user.role = role
        db.session.commit()
        return user

    @staticmethod
    def delete_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return False
        db.session.delete(user)
        db.session.commit()
        return True

    @staticmethod
    def create_account_request(name, email, password_hash):
        """Create a new account request for a user awaiting admin approval."""
        if User.query.filter_by(email=email).first() or AccountRequest.query.filter_by(email=email).first():
            return None
        request = AccountRequest(
            name=name,
            email=email,
            password_hash=password_hash,  # Store the hashed password
            status='pending',
            created_at=datetime.utcnow()
        )
        db.session.add(request)
        db.session.commit()
        return request

    @staticmethod
    def get_account_requests():
        """Retrieve all account requests."""
        return AccountRequest.query.all()

    @staticmethod
    def get_account_request_by_id(request_id):
        """Retrieve a specific account request by ID."""
        return AccountRequest.query.get(request_id)

    @staticmethod
    def approve_account_request(request_id):
        """Approve an account request and convert it to a user."""
        request = AccountRequest.query.get(request_id)
        if not request or request.status != 'pending':
            return None
        user = User(name=request.name, email=request.email, role='user')
        user.password_hash = request.password_hash  # Directly assign the stored hash
        db.session.add(user)
        db.session.delete(request)
        db.session.commit()
        return user

    @staticmethod
    def reject_account_request(request_id):
        """Reject an account request and delete it."""
        request = AccountRequest.query.get(request_id)
        if not request or request.status != 'pending':
            return False
        db.session.delete(request)
        db.session.commit()
        return True

    @staticmethod
    def set_account_request_pending(request_id):
        """Set an account request status to pending."""
        request = AccountRequest.query.get(request_id)
        if not request:
            return False
        request.status = 'pending'
        db.session.commit()
        return True
