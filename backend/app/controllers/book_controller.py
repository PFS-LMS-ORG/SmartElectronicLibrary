from flask import Blueprint, request, jsonify
from app.services.BookService import BookService
from flask_jwt_extended import jwt_required

book_controller = Blueprint('book_controller', __name__)

@book_controller.route('/', methods=['GET'])
def root():
    return jsonify({"message": "Flask backend is running 🚀"})

@book_controller.route('/books', methods=['GET'])
@jwt_required()
def get_books():
    # Get the search query from the request
    search_query = request.args.get('search', '')

    # Call the BookService to fetch books based on the search query
    books = BookService.search_books(search_query)

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/category', methods=['GET'])
@jwt_required()
def get_books_by_category():
    # Get the search query from the request
    search_query = request.args.get('search', '')

    # Call the BookService to fetch books based on the category name
    books = BookService.search_books_by_category(search_query)

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/categories', methods=['GET'])
@jwt_required()
def get_categories():
    # Call the BookService to fetch all categories
    categories = BookService.get_all_categories()

    # Convert the categories to a list of dictionaries and return as JSON response
    return jsonify([category.to_dict() for category in categories])

@book_controller.route('/books/popular', methods=['GET'])
@jwt_required()
def get_popular_books():
    # Call the BookService to fetch popular books
    books = BookService.get_popular_books()

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/featured', methods=['GET'])
@jwt_required()
def get_featured_books():
    # Call the BookService to fetch featured books
    book = BookService.get_featured_book()

    # Convert the book to a dictionary and return as JSON response
    return jsonify(book[0].to_dict())

@book_controller.route('/books/<int:book_id>', methods=['GET'])
@jwt_required()
def get_book_by_id(book_id):
    book = BookService.get_book_by_id(book_id)

    if book:
        return jsonify(book.to_dict())
    else:
        return jsonify({'error': 'Book not found'}), 404