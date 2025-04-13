from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from app.model.association_tables import book_author_association, book_category_association
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

    @staticmethod
    def get_book_by_id(id):
        """
        Fetches a book by its ID.

        :param id: ID of the book
        :return: Book object or None
        """
        return Book.query.get(id)

    @staticmethod
    def get_all_books():
        """
        Fetches all books from the database.

        :return: List of all books
        """
        return Book.query.all()
    
    @staticmethod
    def get_book_count():
        """
        Fetches the total number of books in the database.

        :return: Total number of books
        """
        return Book.query.count() if Book.query.first() else 0
    
    @staticmethod
    def update_book(book_id, data):
        book = Book.query.get(book_id)
        if not book:
            return None

        # Basic fields
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
            new_authors = Author.query.filter(Author.name.in_(data['authors'])).all()
            book.authors = new_authors

        # Update categories if provided
        if 'categories' in data:
            new_categories = Category.query.filter(Category.name.in_(data['categories'])).all()
            book.categories = new_categories

        db.session.commit()
        return book