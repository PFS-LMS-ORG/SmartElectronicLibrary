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