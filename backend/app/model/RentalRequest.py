from datetime import datetime
from app.db import db

class RentalRequest(db.Model):
    __tablename__ = 'rental_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'))
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected'

    user = db.relationship('User', back_populates='rental_requests')
    book = db.relationship('Book', back_populates='rental_requests')

    def __repr__(self):
        return f"<RentalRequest {self.id} - User {self.user_id} requested Book {self.book_id}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'requested_at': self.requested_at.strftime('%Y-%m-%d %H:%M:%S'),
            'status': self.status,
            'user': {
                'id': self.user.id if self.user else None,
                'name': self.user.name if self.user else None,
                'email': self.user.email if self.user else None
            } if self.user else None,  # Return user details if available
            'book': {
                'id': self.book.id if self.book else None,
                'title': self.book.title if self.book else None,
                'cover_url': self.book.cover_url if self.book else None
            } if self.book else None  # Return book details if available
        }

