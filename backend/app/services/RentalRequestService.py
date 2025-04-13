from app.model.RentalRequest import RentalRequest
from app.model.Book import Book
from app.model.User import User
from app.db import db
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import get_jwt_identity
from app.services.BookService import BookService

class RentalRequestService:
    @staticmethod
    def create_request(user_id: int, book_id: int) -> dict:
        """
        Create a new rental request for a book by a user.
        Returns the created request or raises an error if invalid.
        """
        book = Book.query.get(book_id)
        if not book:
            raise ValueError("Book not found")
        
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        existing_request = RentalRequest.query.filter_by(book_id=book_id, status='approved').first()
        if existing_request:
            raise ValueError("Book is already rented")

        if RentalRequest.query.filter_by(user_id=user_id, book_id=book_id, status='pending').first():
            raise ValueError("You already have a pending request for this book")

        try:
            request = RentalRequest(user_id=user_id, book_id=book_id, status='pending')
            db.session.add(request)
            db.session.commit()
            return request.to_dict()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to create rental request")

    @staticmethod
    def get_pending_requests() -> list:
        """
        Get all pending rental requests.
        """
        requests = RentalRequest.query.filter_by(status='pending').all()
        return [request.to_dict() for request in requests]

    @staticmethod
    def get_all_requests(page: int = 1, per_page: int = 10) -> dict:
        """
        Get all rental requests with pagination.
        """
        query = RentalRequest.query
        total_count = query.count()
        requests = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            'requests': [request.to_dict() for request in requests],
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page
        }

    @staticmethod
    def get_user_requests(user_id: int, page: int = 1, per_page: int = 10) -> dict:
        """
        Get all rental requests for a specific user with pagination.
        """
        query = RentalRequest.query.filter_by(user_id=user_id)
        total_count = query.count()
        requests = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            'requests': [request.to_dict() for request in requests],
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page
        }

    @staticmethod
    def get_request_by_id(request_id: int) -> dict:
        """
        Get a specific rental request by ID.
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        return request.to_dict()

    @staticmethod
    def approve_request(request_id: int) -> dict:
        """
        Approve a rental request and update book availability.
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        if request.status != 'pending':
            raise ValueError("Only pending requests can be approved")

        existing_approved = RentalRequest.query.filter_by(book_id=request.book_id, status='approved').first()
        if existing_approved:
            raise ValueError("Book is already rented")

        try:
            request.status = 'approved'
            BookService.update_available_books(request.book_id, increment=False)
            db.session.commit()
            return request.to_dict()
        except:
            db.session.rollback()
            raise ValueError("Failed to approve rental request")

    @staticmethod
    def reject_request(request_id: int) -> dict:
        """
        Reject a rental request (admin only).
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        if request.status != 'pending':
            raise ValueError("Only pending requests can be rejected")

        try:
            request.status = 'rejected'
            db.session.commit()
            return request.to_dict()
        except:
            db.session.rollback()
            raise ValueError("Failed to reject rental request")

    @staticmethod
    def cancel_request(request_id: int, user_id: int) -> dict:
        """
        Cancel a pending rental request without affecting book availability.
        
        :param request_id: ID of the rental request
        :param user_id: ID of the user attempting to cancel
        :return: Success message
        """
        request = RentalRequest.query.get(request_id)
        print(f"Cancel request: request.user_id={request.user_id}, user_id={user_id}")  # Debug log
        if not request:
            raise ValueError("Rental request not found")
        if request.user_id != user_id:
            raise ValueError("You can only cancel your own requests")
        if request.status != 'pending':
            raise ValueError("Only pending requests can be canceled")

        try:
            db.session.delete(request)
            db.session.commit()
            return {'message': 'Rental request canceled successfully'}
        except:
            db.session.rollback()
            raise ValueError("Failed to cancel rental request")

    @staticmethod
    def get_all_requested_books() -> list:
        """
        Get all books that have pending rental requests.
        """
        requested_books = (
            db.session.query(Book)
            .join(RentalRequest)
            .filter(RentalRequest.status == 'pending')
            .distinct()
            .all()
        )
        return [book.to_dict() for book in requested_books]