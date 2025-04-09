from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from sqlalchemy.orm import joinedload

class BookService:

    @staticmethod
    def search_books(search_query):
        """
        Searches books based on the search query. The search looks for:
        - Title of the book
        - Author's name
        - Category name

        :param search_query: Search string
        :return: List of books that match the search criteria
        """
        # Search for books based on title, author, or category
        

        books = Book.query.options(
            joinedload(Book.authors),
            joinedload(Book.categories)
        ).filter(
            Book.title.ilike(f"%{search_query}%")
        ).all()


        return books
    
    @staticmethod
    def search_books_by_category(search_query):
        """
        Searches books based on the category name.

        :param search_query: Search string
        :return: List of books that match the search criteria
        """

        books = Book.query.options(
            joinedload(Book.authors),
            joinedload(Book.categories)
        ).join(Book.categories).filter(
            Category.name.ilike(f"%{search_query}%")
        ).all()

        return books
    
    @staticmethod
    def get_all_categories():
        """
        Fetches all categories from the database.

        :return: List of all categories
        """
        categories = Category.query.all()
        return categories
    
    @staticmethod
    def get_popular_books():
        """
        Fetches the most popular books based on borrow count.

        :return: List of popular books
        """
        popular_books = Book.query.order_by(Book.borrow_count.desc()).limit(6).all()
        return popular_books
    
    @staticmethod
    def get_featured_book():
        """
        Fetches the featured books.

        :return: List of featured books
        """
        featured_book = Book.query.filter_by(featured_book=True).all()
        return featured_book