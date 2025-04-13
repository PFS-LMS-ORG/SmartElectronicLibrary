from app.db import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True)
    role = db.Column(db.String(10), default='user')

    rentals = db.relationship('Rental', back_populates='user')
    rental_requests = db.relationship('RentalRequest', back_populates='user')

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
