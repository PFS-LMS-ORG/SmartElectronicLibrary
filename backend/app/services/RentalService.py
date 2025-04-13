from app.model import Rental
from app.db import db
from datetime import datetime

class RentalService:
    @staticmethod
    def create_rental(user_id, book_id):
        rental = Rental(user_id=user_id, book_id=book_id)
        db.session.add(rental)
        db.session.commit()
        return rental
    
    @staticmethod
    def return_book(rental_id):
        rental = Rental.query.get(rental_id)
        if rental:
            rental.returned_at = datetime.utcnow()
            db.session.commit()
            return rental
        return None
    
    @staticmethod
    def get_user_rentals(user_id):
        rentals = Rental.query.filter_by(user_id=user_id).all()
        return rentals


    @staticmethod
    def get_book_rentals(book_id):
        rentals = Rental.query.filter_by(book_id=book_id).all()
        return rentals
    
    # Static method to get all rentals
    @staticmethod
    def get_all_rentals():
        """
        Fetches all rentals from the database.
        """
        
        rentals = Rental.query.all()
        return rentals