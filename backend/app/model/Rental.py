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
