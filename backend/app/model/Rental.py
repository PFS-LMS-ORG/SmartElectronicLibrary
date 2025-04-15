from datetime import datetime
from app.db import db

class Rental(db.Model):
    __tablename__ = 'rentals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'))
    rented_at = db.Column(db.DateTime, default=datetime.utcnow)
    returned_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', back_populates='rentals')
    book = db.relationship('Book', back_populates='rentals')

    def __repr__(self):
        return f"<Rental {self.id} - User {self.user_id} rented Book {self.book_id}>"

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'rented_at': self.rented_at.strftime('%Y-%m-%d %H:%M:%S') if self.rented_at else None,
            'returned_at': self.returned_at.strftime('%Y-%m-%d %H:%M:%S') if self.returned_at else None,
            'user': {
                'id': self.user.id if self.user else None,
                'name': self.user.name if self.user else None,
                'email': self.user.email if self.user else None
            } if self.user else None,
            'book': {
                'id': self.book.id if self.book else None,
                'title': self.book.title if self.book else None,
                'cover_url': self.book.cover_url if self.book else None,
                'authors': [author.name for author in self.book.authors] if self.book and self.book.authors else [],
                'categories': [category.name for category in self.book.categories] if self.book and self.book.categories else []
            } if self.book else None
        }