from app.db import db
from flask_bcrypt import Bcrypt
from datetime import datetime

bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(10), default='user')
    date_joined = db.Column(db.DateTime, default=datetime.utcnow)  # Added date_joined field
    login_count = db.Column(db.Integer, default=0)
    rentals = db.relationship('Rental', back_populates='user')
    rental_requests = db.relationship('RentalRequest', back_populates='user')
    chat_messages = db.relationship("ChatMessage", back_populates="user")
    liked_articles = db.relationship('ArticleLike', back_populates='user', cascade="all, delete-orphan")
    bookmarked_articles = db.relationship('ArticleBookmark', back_populates='user', cascade="all, delete-orphan")
    notifications = db.relationship('Notification', back_populates='user', cascade='all, delete-orphan')

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
            'date_joined': self.date_joined.strftime("%Y-%m-%d %H:%M:%S") if self.date_joined else None,
            'rentals': [rental.to_dict() for rental in self.rentals],
            'rental_requests': [request.to_dict() for request in self.rental_requests],
            'liked_articles': [article.to_dict() for article in self.liked_articles],
            'bookmarked_articles': [article.to_dict() for article in self.bookmarked_articles],
            'notifications': [notification.to_dict() for notification in self.notifications]
        }