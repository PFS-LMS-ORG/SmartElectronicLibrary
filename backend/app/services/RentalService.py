from app.model import Rental, Book, User
from app.db import db
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

class RentalService:
    @staticmethod
    def create_rental(user_id, book_id, update_book=False):
        """
        Creates a new rental for a user and book.
        """
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")

        book = Book.query.get(book_id)
        if not book:
            raise ValueError("Book not found")
        if book.available_books <= 0:
            raise ValueError("No copies available for this book")

        existing_rental = Rental.query.filter_by(
            user_id=user_id, book_id=book_id, returned_at=None
        ).first()
        if existing_rental:
            raise ValueError("User already has an active rental for this book")

        rental = Rental(user_id=user_id, book_id=book_id)
        db.session.add(rental)

        if update_book:
            book.available_books -= 1
            book.borrow_count += 1

        try:
            db.session.commit()
            return rental
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to create rental")

    @staticmethod
    def return_book(rental_id):
        """
        Marks a rental as returned and updates book availability.
        """
        rental = Rental.query.get(rental_id)
        if not rental:
            raise ValueError("Rental not found")
        if rental.returned_at:
            raise ValueError("Rental already returned")

        book = Book.query.get(rental.book_id)
        if not book:
            raise ValueError("Book not found")

        try:
            rental.returned_at = datetime.utcnow()
            book.available_books += 1
            db.session.commit()
            return rental
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to return rental")

    @staticmethod
    def update_rental(rental_id, data):
        """
        Updates a rental's details.
        """
        rental = Rental.query.get(rental_id)
        if not rental:
            raise ValueError("Rental not found")

        user_id = data.get('user_id')
        book_id = data.get('book_id')
        rented_at = data.get('rented_at')
        returned_at = data.get('returned_at')

        old_book_id = rental.book_id
        was_returned = rental.returned_at is not None

        try:
            if user_id:
                user = User.query.get(user_id)
                if not user:
                    raise ValueError("User not found")
                rental.user_id = user_id

            if book_id and book_id != old_book_id:
                book = Book.query.get(book_id)
                if not book:
                    raise ValueError("Book not found")
                if book.available_books <= 0 and not was_returned:
                    raise ValueError("No copies available for this book")
                rental.book_id = book_id
                # Update old and new book counts
                old_book = Book.query.get(old_book_id)
                if old_book and not was_returned:
                    old_book.available_books += 1
                if book and not was_returned:
                    book.available_books -= 1
                    book.borrow_count += 1

            if rented_at:
                try:
                    rental.rented_at = datetime.fromisoformat(rented_at.replace('Z', '+00:00'))
                except ValueError:
                    raise ValueError("Invalid rented_at format")

            if 'returned_at' in data:
                if returned_at:
                    try:
                        rental.returned_at = datetime.fromisoformat(returned_at.replace('Z', '+00:00'))
                    except ValueError:
                        raise ValueError("Invalid returned_at format")
                else:
                    if not was_returned:
                        book = Book.query.get(rental.book_id)
                        if book:
                            book.available_books += 1
                    rental.returned_at = None

            db.session.commit()
            return rental
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to update rental")

    @staticmethod
    def delete_rental(rental_id):
        """
        Deletes a rental and updates book availability if active.
        """
        rental = Rental.query.get(rental_id)
        if not rental:
            raise ValueError("Rental not found")

        book = Book.query.get(rental.book_id)
        try:
            if not rental.returned_at and book:
                book.available_books += 1
            db.session.delete(rental)
            db.session.commit()
            return {"message": "Rental deleted successfully"}
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to delete rental")

    @staticmethod
    def bulk_delete_rentals(rental_ids):
        """
        Deletes multiple rentals and updates book availability.
        """
        if not rental_ids:
            raise ValueError("No rental IDs provided")

        try:
            for rental_id in rental_ids:
                rental = Rental.query.get(rental_id)
                if rental:
                    book = Book.query.get(rental.book_id)
                    if not rental.returned_at and book:
                        book.available_books += 1
                    db.session.delete(rental)
            db.session.commit()
            return {"message": f"Deleted {len(rental_ids)} rentals"}
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to delete rentals")

    @staticmethod
    def get_rental_by_id(rental_id):
        """
        Fetches a rental by its ID.
        """
        rental = Rental.query.get(rental_id)
        if not rental:
            raise ValueError("Rental not found")
        return rental
    
    @staticmethod
    def get_user_book_rental(user_id,book_id):
        """
        Fetches the latest rental for a specific user and book.
        """
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        book = Book.query.get(book_id)
        if not book:
            raise ValueError("Book not found")
        rental = Rental.query.filter_by(user_id=user_id, book_id=book_id).order_by(Rental.rented_at.desc()).first()
        return rental

    @staticmethod
    def get_user_rentals(user_id):
        """
        Fetches all rentals for a specific user.
        """
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        rentals = Rental.query.filter_by(user_id=user_id).all()
        return rentals

    @staticmethod
    def get_book_rentals(book_id):
        """
        Fetches all rentals for a specific book.
        """
        book = Book.query.get(book_id)
        if not book:
            raise ValueError("Book not found")
        rentals = Rental.query.filter_by(book_id=book_id).all()
        return rentals

    @staticmethod
    def get_all_rentals(page=1, per_page=10, status=None, search=None):
        """
        Fetches all rentals with pagination, status filter, and search.
        """
        query = Rental.query.join(User).join(Book)

        if status == 'active':
            query = query.filter(Rental.returned_at.is_(None))
        elif status == 'returned':
            query = query.filter(Rental.returned_at.isnot(None))

        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term),
                    Book.title.ilike(search_term)
                )
            )

        total_count = query.count()
        rentals = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            "rentals": [rental.to_dict() for rental in rentals],
            "total_count": total_count,
            "total_pages": (total_count + per_page - 1) // per_page,
        }

    @staticmethod
    def get_active_rentals():
        """
        Fetches all active (unreturned) rentals.
        """
        rentals = Rental.query.filter(Rental.returned_at.is_(None)).all()
        return [rental.to_dict() for rental in rentals]