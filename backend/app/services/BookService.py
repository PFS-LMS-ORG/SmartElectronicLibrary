from operator import or_
from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from app.model.association_tables import book_author_association, book_category_association
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any, Optional

class BookService:
    @staticmethod
    def create_book(data: Dict[str, Any]) -> Optional[Book]:
        """
        Creates a new book with associated authors and categories.
        
        :param data: Dictionary with book details (title, cover_url, etc.)
        :return: Created Book object or None if creation fails
        """
        try:
            # Validate required fields
            required_fields = ['title', 'total_books']
            if not all(field in data for field in required_fields):
                raise ValueError("Missing required fields: title, total_books")

            # Create new book
            book = Book(
                title=data['title'],
                cover_url=data.get('cover_url', ''),
                description=data.get('description', ''),
                rating=data.get('rating', 0.0),
                summary=data.get('summary', ''),
                borrow_count=data.get('borrow_count', 0),
                total_books=data['total_books'],
                available_books=data.get('available_books', data['total_books']),
                featured_book=data.get('featured_book', False)
            )

            # Handle authors
            if 'authors' in data and data['authors']:
                authors = Author.query.filter(Author.name.in_(data['authors'])).all()
                # Create new authors if they don't exist
                existing_author_names = {author.name for author in authors}
                for author_name in data['authors']:
                    if author_name not in existing_author_names:
                        new_author = Author(name=author_name)
                        authors.append(new_author)
                        db.session.add(new_author)
                book.authors = authors

            # Handle categories
            if 'categories' in data and data['categories']:
                categories = Category.query.filter(Category.name.in_(data['categories'])).all()
                # Create new categories if they don't exist
                existing_category_names = {category.name for category in categories}
                for category_name in data['categories']:
                    if category_name not in existing_category_names:
                        new_category = Category(name=category_name)
                        categories.append(new_category)
                        db.session.add(new_category)
                book.categories = categories

            db.session.add(book)
            db.session.commit()
            return book
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to create book: Duplicate title or invalid data")
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to create book: {str(e)}")

    @staticmethod
    def bulk_create_books(books_data: List[Dict[str, Any]]) -> List[Book]:
        """
        Creates multiple books in a single transaction.
        
        :param books_data: List of dictionaries with book details
        :return: List of created Book objects
        """
        created_books = []
        try:
            for data in books_data:
                book = BookService.create_book(data)
                if book:
                    created_books.append(book)
            return created_books
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to bulk create books: {str(e)}")

    @staticmethod
    def update_book(book_id: int, data: Dict[str, Any]) -> Optional[Book]:
        """
        Updates an existing book’s fields, authors, and categories.
        
        :param book_id: ID of the book to update
        :param data: Dictionary with updated fields
        :return: Updated Book object or None if not found
        """
        book = Book.query.get(book_id)
        if not book:
            return None

        try:
            # Update basic fields
            book.title = data.get('title', book.title)
            book.cover_url = data.get('cover_url', book.cover_url)
            book.description = data.get('description', book.description)
            book.rating = data.get('rating', book.rating)
            book.summary = data.get('summary', book.summary)
            book.borrow_count = data.get('borrow_count', book.borrow_count)
            book.total_books = data.get('total_books', book.total_books)
            book.available_books = data.get('available_books', book.available_books)
            book.featured_book = data.get('featured_book', book.featured_book)

            # Update authors if provided
            if 'authors' in data:
                authors = Author.query.filter(Author.name.in_(data['authors'])).all()
                existing_author_names = {author.name for author in authors}
                for author_name in data['authors']:
                    if author_name not in existing_author_names:
                        new_author = Author(name=author_name)
                        authors.append(new_author)
                        db.session.add(new_author)
                book.authors = authors

            # Update categories if provided
            if 'categories' in data:
                categories = Category.query.filter(Category.name.in_(data['categories'])).all()
                existing_category_names = {category.name for category in categories}
                for category_name in data['categories']:
                    if category_name not in existing_category_names:
                        new_category = Category(name=category_name)
                        categories.append(new_category)
                        db.session.add(new_category)
                book.categories = categories

            db.session.commit()
            return book
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Failed to update book: Duplicate title or invalid data")
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to update book: {str(e)}")

    @staticmethod
    def delete_book(book_id: int) -> bool:
        """
        Deletes a book by its ID.
        
        :param book_id: ID of the book to delete
        :return: True if deleted, False if not found
        """
        book = Book.query.get(book_id)
        if not book:
            return False
        try:
            db.session.delete(book)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to delete book: {str(e)}")

    @staticmethod
    def update_available_books(book_id: int, increment: bool = False) -> Optional[Book]:
        """
        Updates the available_books count for a book (e.g., after rental approval/cancellation).
        
        :param book_id: ID of the book
        :param increment: True to increase count, False to decrease
        :return: Updated Book object or None if not found
        """
        book = Book.query.get(book_id)
        if not book:
            return None
        try:
            if increment:
                book.available_books = min(book.available_books + 1, book.total_books)
            else:
                if book.available_books <= 0:
                    raise ValueError("No books available")
                book.available_books -= 1
            db.session.commit()
            return book
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to update available books: {str(e)}")

    @staticmethod
    def search_books(search_query: str, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """
        Searches books by title, author name, or category name with pagination.
        
        :param search_query: Search string
        :param page: Page number
        :param per_page: Items per page
        :return: Dictionary with books, total_count, total_pages
        """
        query = Book.query.options(
            joinedload(Book.authors),
            joinedload(Book.categories)
        )

        if search_query:
            query = query.join(Book.authors).join(Book.categories).filter(
                or_(
                    Book.title.ilike(f"%{search_query}%"),
                    Author.name.ilike(f"%{search_query}%"),
                    Category.name.ilike(f"%{search_query}%")
                )
            ).distinct(Book.id)

        total_count = query.count()
        books = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            'books': [book.to_dict() for book in books],
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page
        }

    @staticmethod
    def search_books_by_category(search_query: str, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """
        Searches books by category name with pagination.
        
        :param search_query: Category search string
        :param page: Page number
        :param per_page: Items per page
        :return: Dictionary with books, total_count, total_pages
        """
        query = Book.query.options(
            joinedload(Book.authors),
            joinedload(Book.categories)
        )

        if search_query:
            query = query.join(Book.categories).filter(
                Category.name.ilike(f"%{search_query}%")
            )

        total_count = query.count()
        books = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            'books': [book.to_dict() for book in books],
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page
        }

    @staticmethod
    def get_all_categories() -> List[Category]:
        """
        Fetches all categories from the database.
        
        :return: List of all categories
        """
        return Category.query.all()

    @staticmethod
    def get_popular_books(limit: int = 6) -> List[Book]:
        """
        Fetches the most popular books based on borrow count.
        
        :param limit: Number of books to return
        :return: List of popular books
        """
        return Book.query.order_by(Book.borrow_count.desc()).limit(limit).all()

    @staticmethod
    def get_featured_book() -> Optional[Book]:
        """
        Fetches a featured book (first one found).
        
        :return: Book object or None
        """
        return Book.query.filter_by(featured_book=True).first()

    @staticmethod
    def get_book_by_id(book_id: int) -> Optional[Book]:
        """
        Fetches a book by its ID with related authors and categories.
        
        :param book_id: ID of the book
        :return: Book object or None
        """
        return Book.query.options(
            joinedload(Book.authors),
            joinedload(Book.categories)
        ).get(book_id)

    @staticmethod
    def get_all_books(page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """
        Fetches all books from the database with pagination.
        
        :param page: Page number
        :param per_page: Items per page
        :return: Dictionary with books, total_count, total_pages
        """
        query = Book.query.options(
            joinedload(Book.authors),
            joinedload(Book.categories)
        )
        total_count = query.count()
        books = query.paginate(page=page, per_page=per_page, error_out=False).items
        return {
            'books': [book.to_dict() for book in books],
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page
        }

    @staticmethod
    def get_book_count() -> int:
        """
        Fetches the total number of books in the database.
        
        :return: Total number of books
        """
        return Book.query.count()