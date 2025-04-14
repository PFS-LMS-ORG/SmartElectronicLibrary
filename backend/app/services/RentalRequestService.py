from app.model import RentalRequest, User, Book, Rental
from app.db import db
from app.services.RentalService import RentalService
from sqlalchemy.exc import IntegrityError
from datetime import datetime

class RentalRequestService:
    @staticmethod
    def create_request(user_id, book_id):
        """
        Creates a new rental request for a book by a user.
        """
        book = Book.query.get(book_id)
        if not book:
            raise ValueError("Book not found")
        if book.available_books <= 0:
            raise ValueError("No copies available for this book")

        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")

        # Check for existing pending/approved request
        existing_request = RentalRequest.query.filter_by(
            user_id=user_id, book_id=book_id, status="pending"
        ).first()
        if existing_request:
            raise ValueError("You already have a pending request for this book")

        request = RentalRequest(user_id=user_id, book_id=book_id)
        db.session.add(request)
        try:
            db.session.commit()
            return request.to_dict()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to create rental request")

    @staticmethod
    def get_pending_requests():
        """
        Fetches all pending rental requests.
        """
        requests = RentalRequest.query.filter_by(status="pending").all()
        return [req.to_dict() for req in requests]

    @staticmethod
    def get_all_requests(page=1, per_page=10):
        """
        Fetches all rental requests with pagination.
        """
        query = RentalRequest.query
        total_count = query.count()
        requests = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            "requests": [req.to_dict() for req in requests],
            "total_count": total_count,
            "total_pages": (total_count + per_page - 1) // per_page,
        }

    @staticmethod
    def get_user_requests(user_id, page=1, per_page=10):
        """
        Fetches rental requests for a specific user with pagination.
        """
        query = RentalRequest.query.filter_by(user_id=user_id)
        total_count = query.count()
        requests = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            "requests": [req.to_dict() for req in requests],
            "total_count": total_count,
            "total_pages": (total_count + per_page - 1) // per_page,
        }

    @staticmethod
    def get_request_by_id(request_id):
        """
        Fetches a rental request by ID.
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        return request.to_dict()

    @staticmethod
    def approve_request(request_id):
        """
        Approves a rental request, creates a rental, and updates book availability.
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        if request.status != "pending":
            raise ValueError("Request is not pending")

        book = Book.query.get(request.book_id)
        if not book:
            raise ValueError("Book not found")
        if book.available_books <= 0:
            raise ValueError("No copies available for this book")

        try:
            # Start transaction
            request.status = "approved"
            
            # Create rental
            rental = RentalService.create_rental(request.user_id, request.book_id, update_book=True)
            
            # Update book
            book.available_books -= 1
            book.borrow_count += 1

            db.session.commit()
            return request.to_dict()
        except (IntegrityError, ValueError) as e:
            db.session.rollback()
            raise ValueError(f"Failed to approve request: {str(e)}")
        except Exception as e:
            db.session.rollback()
            raise ValueError("Internal server error")

    @staticmethod
    def reject_request(request_id):
        """
        Rejects a rental request.
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        if request.status != "pending":
            raise ValueError("Request is not pending")

        try:
            request.status = "rejected"
            db.session.commit()
            return request.to_dict()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to reject request")

    @staticmethod
    def cancel_request(request_id, user_id):
        """
        Cancels a user's own rental request.
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        if request.user_id != user_id:
            raise ValueError("You can only cancel your own requests")
        if request.status != "pending":
            raise ValueError("Only pending requests can be canceled")

        try:
            db.session.delete(request)
            db.session.commit()
            return {"message": "Rental request canceled"}
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to cancel request")

    @staticmethod
    def get_all_requested_books():
        """
        Fetches all books with pending rental requests.
        """
        books = (
            db.session.query(Book)
            .join(RentalRequest)
            .filter(RentalRequest.status == "pending")
            .distinct()
            .all()
        )
        return [book.to_dict() for book in books]