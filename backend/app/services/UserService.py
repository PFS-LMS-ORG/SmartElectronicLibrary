from app.model.User import User  # Adjust path as needed
from app.db import db

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