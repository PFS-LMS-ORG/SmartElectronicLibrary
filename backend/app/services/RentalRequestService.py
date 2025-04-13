from app.model.RentalRequest import RentalRequest
from app.db import db
from app.model.Book import Book

class RentalRequestService:
    @staticmethod
    def get_pending_requests():
        return RentalRequest.query.filter_by(status='pending').all()
    
    @staticmethod
    def get_all_requested_books():
        requested_books = db.session.query(Book).join(RentalRequest).filter(RentalRequest.status == 'pending').all()
        return requested_books

