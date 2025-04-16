from app.model import RentalRequest, User, Book, Rental
from app.db import db
from app.services.RentalService import RentalService
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from datetime import datetime
from math import ceil

class RentalRequestService:
    @staticmethod
    def create_request(user_id, book_id):
        """
        Creates a new rental request for a book by a user.
        
        Args:
            user_id (int): ID of the user making the request
            book_id (int): ID of the book being requested
        
        Returns:
            dict: The created rental request as a dictionary
        
        Raises:
            ValueError: If the user or book is not found, book is unavailable, or request already exists
        """
        # Validate book
        book = Book.query.get(book_id)
        if not book:
            raise ValueError("Book not found")
        if book.available_books <= 0:
            raise ValueError("No copies available for this book")

        # Validate user
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")

        # Check for existing pending request
        existing_request = RentalRequest.query.filter_by(
            user_id=user_id, book_id=book_id, status="pending"
        ).first()
        if existing_request:
            raise ValueError("You already have a pending request for this book")

        # Create new request
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
        
        Returns:
            list: List of pending rental requests as dictionaries
        """
        requests = RentalRequest.query.filter_by(status="pending").all()
        return [req.to_dict() for req in requests]

    @staticmethod
    def get_all_requests(page=1, per_page=10, status='all', search=''):
        """
        Fetches all rental requests with pagination and filtering.
        
        Args:
            page (int): Page number
            per_page (int): Number of items per page
            status (str): Filter by status ('all', 'pending', 'approved', 'rejected')
            search (str): Search term to filter by user name, email, or book title
        
        Returns:
            dict: Contains rental_requests, total_count, and total_pages
        """
        try:
            # Base query
            query = RentalRequest.query

            # Apply status filter
            if status != 'all':
                query = query.filter(RentalRequest.status == status)

            # Apply search filter
            if search:
                search_term = f'%{search}%'
                query = query.join(RentalRequest.user).join(RentalRequest.book).filter(
                    or_(
                        RentalRequest.user.has(User.name.ilike(search_term)),
                        RentalRequest.user.has(User.email.ilike(search_term)),
                        RentalRequest.book.has(Book.title.ilike(search_term))
                    )
                )

            # Get total count for pagination
            total_count = query.count()

            # Calculate total pages
            total_pages = max(1, ceil(total_count / per_page))

            # Apply pagination
            requests = query.order_by(RentalRequest.requested_at.desc())\
                           .offset((page - 1) * per_page)\
                           .limit(per_page)\
                           .all()

            # Return response
            return {
                'requests': [req.to_dict() for req in requests],
                'total_count': total_count,
                'total_pages': total_pages
            }

        except Exception as e:
            raise ValueError(f"Failed to fetch rental requests: {str(e)}")

    @staticmethod
    def get_user_requests(user_id, page=1, per_page=10):
        """
        Fetches rental requests for a specific user with pagination.
        
        Args:
            user_id (int): ID of the user
            page (int): Page number
            per_page (int): Number of items per page
        
        Returns:
            dict: Contains requests, total_count, and total_pages
        """
        query = RentalRequest.query.filter_by(user_id=user_id)
        total_count = query.count()
        requests = query.order_by(RentalRequest.requested_at.desc())\
                       .offset((page - 1) * per_page)\
                       .limit(per_page)\
                       .all()
        return {
            "requests": [req.to_dict() for req in requests],
            "total_count": total_count,
            "total_pages": max(1, ceil(total_count / per_page))
        }

    @staticmethod
    def get_request_by_id(request_id):
        """
        Fetches a rental request by ID.
        
        Args:
            request_id (int): ID of the rental request
        
        Returns:
            dict: The rental request as a dictionary
        
        Raises:
            ValueError: If the request is not found
        """
        request = RentalRequest.query.get(request_id)
        if not request:
            raise ValueError("Rental request not found")
        return request.to_dict()

    @staticmethod
    def approve_request(request_id):
        """
        Approves a rental request, creates a rental, and updates book availability.
        
        Args:
            request_id (int): ID of the rental request
        
        Returns:
            dict: The updated rental request as a dictionary
        
        Raises:
            ValueError: If the request, book, or approval fails
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
            
            # Create rental using RentalService
            rental = RentalService.create_rental(request.user_id, request.book_id, update_book=True)
            
            # Update book availability
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
        
        Args:
            request_id (int): ID of the rental request
        
        Returns:
            dict: The updated rental request as a dictionary
        
        Raises:
            ValueError: If the request is not found or not pending
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
        
        Args:
            request_id (int): ID of the rental request
            user_id (int): ID of the user attempting to cancel
        
        Returns:
            dict: Success message
        
        Raises:
            ValueError: If the request is not found, not owned by user, or not pending
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
        
        Returns:
            list: List of books with pending requests as dictionaries
        """
        books = (
            db.session.query(Book)
            .join(RentalRequest)
            .filter(RentalRequest.status == "pending")
            .distinct()
            .all()
        )
        return [book.to_dict() for book in books]