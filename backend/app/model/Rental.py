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
            'rented_at': self.rented_at.strftime('%Y-%m-%d %H:%M:%S'),
            'returned_at': self.returned_at.strftime('%Y-%m-%d %H:%M:%S') if self.returned_at else None,
            'user': self.user.name if self.user else None,
            'book': self.book.title if self.book else None
        }
