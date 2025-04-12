from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from sqlalchemy.orm import joinedload
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class BookService:
    @staticmethod
    def search_books(search_query):
        """
        Searches books based on the search query.
        """
        logger.debug("Searching books with query: %s", search_query)
        books = (
            Book.query
            .options(
                joinedload(Book.authors),
                joinedload(Book.categories)
            )
            .filter(Book.title.ilike(f"%{search_query}%"))
            .all()
        )
        logger.debug("Search returned %d books", len(books))
        return books or []

    @staticmethod
    def search_books_by_category(search_query):
        """
        Searches books based on the category name.
        """
        logger.debug("Searching books by category: %s", search_query)
        books = (
            Book.query
            .options(
                joinedload(Book.authors),
                joinedload(Book.categories)
            )
            .join(Book.categories)
            .filter(Category.name.ilike(f"%{search_query}%"))
            .all()
        )
        logger.debug("Category search returned %d books", len(books))
        return books or []

    @staticmethod
    def get_all_categories():
        """
        Fetches all categories.
        """
        logger.debug("Fetching all categories")
        categories = Category.query.all()
        logger.debug("Fetched %d categories", len(categories))
        return categories or []

    @staticmethod
    def get_popular_books():
        """
        Fetches the most popular books based on borrow count.
        """
        logger.debug("Fetching popular books")
        popular_books = (
            Book.query
            .options(
                joinedload(Book.authors),
                joinedload(Book.categories)
            )
            .order_by(Book.borrow_count.desc())
            .limit(6)
            .all()
        )
        logger.debug("Fetched %d popular books", len(popular_books))
        return popular_books or []

    @staticmethod
    def get_featured_book():
        """
        Fetches the featured books.
        """
        logger.debug("Fetching featured books")
        featured_books = (
            Book.query
            .options(
                joinedload(Book.authors),
                joinedload(Book.categories)
            )
            .filter_by(featured_book=True)
            .all()
        )
        logger.debug("Fetched %d featured books", len(featured_books))
        return featured_books or []

    @staticmethod
    def get_book_by_id(id):
        """
        Fetches a book by its ID.
        """
        logger.debug("Fetching book ID: %d", id)
        book = (
            Book.query
            .options(
                joinedload(Book.authors),
                joinedload(Book.categories)
            )
            .get(id)
        )
        logger.debug("Book fetched: %s" if book else "Book not found: %d", book.title if book else id)
        return book