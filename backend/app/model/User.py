from app.db import db
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(10), default='user')

    rentals = db.relationship('Rental', back_populates='user')
    rental_requests = db.relationship('RentalRequest', back_populates='user')
    chat_messages = db.relationship("ChatMessage", back_populates="user")
    liked_articles = db.relationship('ArticleLike', back_populates='user', cascade="all, delete-orphan")
    bookmarked_articles = db.relationship('ArticleBookmark', back_populates='user', cascade="all, delete-orphan")

    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Verify the provided password against the stored hash."""
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.name} ({self.email})>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'rentals': [rental.to_dict() for rental in self.rentals],
            'rental_requests': [request.to_dict() for request in self.rental_requests]
    }