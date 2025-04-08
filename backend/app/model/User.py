from app.db import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True)
    role = db.Column(db.String(10), default='user')

    rentals = db.relationship('Rental', back_populates='user')

    def __repr__(self):
        return f"<User {self.name} ({self.email})>"
