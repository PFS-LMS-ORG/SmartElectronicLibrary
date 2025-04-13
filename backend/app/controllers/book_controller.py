from flask import Blueprint, request, jsonify
from app.services.BookService import BookService
from app.services.RentalRequestService import RentalRequestService

book_controller = Blueprint('book_controller', __name__)

@book_controller.route('/books', methods=['GET'])
def get_books():
    print("searched books")
    # Get the search query from the request
    search_query = request.args.get('search', '')

    # Call the BookService to fetch books based on the search query
    books = BookService.search_books(search_query)

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/category', methods=['GET'])
def get_books_by_category():
    # Get the search query from the request
    search_query = request.args.get('search', '')

    # Call the BookService to fetch books based on the category name
    books = BookService.search_books_by_category(search_query)

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/categories', methods=['GET'])
def get_categories():
    # Call the BookService to fetch all categories
    categories = BookService.get_all_categories()

    # Convert the categories to a list of dictionaries and return as JSON response
    return jsonify([category.to_dict() for category in categories])

@book_controller.route('/books/popular', methods=['GET'])
def get_popular_books():
    # Call the BookService to fetch popular books
    books = BookService.get_popular_books()

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/featured', methods=['GET'])
def get_featured_books():
    # Call the BookService to fetch featured books
    book = BookService.get_featured_book()

    # Convert the books to a list of dictionaries and return as JSON response
    return jsonify(book[0].to_dict())

@book_controller.route('/books/<int:book_id>', methods=['GET'])
def get_book_by_id(book_id):
    print(f"Requested book ID: {book_id}")
    book = BookService.get_book_by_id(book_id)

    if book:
        return jsonify(book.to_dict())
    else:
        return jsonify({'error': 'Book not found'}), 404


#get all requested books
@book_controller.route('/books/rentals/requested', methods=['GET'])
def get_requested_books():
    requests = RentalRequestService.get_pending_requests()
    return jsonify([request.to_dict() for request in requests]), 200

#edit book
@book_controller.route('/books/<int:book_id>', methods=['PUT'])
def edit_book(book_id):
    data = request.get_json()
    updated_book = BookService.update_book(book_id, data)
    
    if not updated_book:
        return jsonify({'error': 'Book not found'}), 404
    
    return jsonify(updated_book.to_dict()), 200