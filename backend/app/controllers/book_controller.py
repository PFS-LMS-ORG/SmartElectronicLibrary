# backend/app/controllers/book_controller.py
from operator import or_
from flask import Blueprint, request, jsonify
from app.services.BookService import BookService
from flask_jwt_extended import jwt_required
import logging
from app.model import Book, Category, Author  # Import Author model
from app import db

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define the Blueprint
book_controller = Blueprint('book_controller', __name__)

@book_controller.route('/', methods=['GET'])
def root():
    logger.debug("Root endpoint hit")
    return jsonify({"message": "Flask backend is running 🚀"})

@book_controller.route('/books', methods=['GET'])
@jwt_required()
def get_books():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search = request.args.get('search', '')
    category = request.args.get('category', '')

    query = Book.query

    # Search filter
    if search:
        # Join with Author through the authors relationship and search on Author.name
        query = query.join(Book.authors).filter(or_(
            Book.title.ilike(f'%{search}%'),
            Author.name.ilike(f'%{search}%')
        )).distinct(Book.id)  # Avoid duplicates due to multiple authors

    # Category filter
    if category:
        # Join Book with Category through the relationship (via the junction table)
        query = query.join(Book.categories).filter(Category.name == category)

    # Get total count for pagination
    total_count = query.count()
    # Paginate the results
    books = query.paginate(page=page, per_page=per_page, error_out=False).items
    book_list = [book.to_dict() for book in books]

    return jsonify({
        'books': book_list,
        'total_count': total_count,
        'total_pages': (total_count + per_page - 1) // per_page
    })

@book_controller.route('/books/category', methods=['GET'])
@jwt_required()
def get_books_by_category():
    logger.debug("Fetching books by category: %s", request.args.get('search', ''))
    search_query = request.args.get('search', '')
    books = BookService.search_books_by_category(search_query) or []
    logger.debug("Books by category fetched: %d", len(books))
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/categories', methods=['GET'])
@jwt_required()
def get_categories():
    logger.debug("Fetching categories")
    categories = BookService.get_all_categories() or []
    logger.debug("Categories fetched: %d", len(categories))
    return jsonify([category.to_dict() for category in categories])

@book_controller.route('/books/popular', methods=['GET'])
@jwt_required()
def get_popular_books():
    logger.debug("Fetching popular books")
    books = BookService.get_popular_books() or []
    logger.debug("Popular books fetched: %d", len(books))
    if not books:
        logger.warning("No popular books found")
        return jsonify({'message': 'No popular books found'}), 404
    return jsonify([book.to_dict() for book in books])

@book_controller.route('/books/featured', methods=['GET'])
@jwt_required()
def get_featured_books():
    logger.debug("Fetching featured books")
    books = BookService.get_featured_book() or []
    if not books:
        logger.warning("No featured book found")
        return jsonify({'message': 'No featured book found'}), 404
    return jsonify(books.to_dict())

@book_controller.route('/books/<int:book_id>', methods=['GET'])
@jwt_required()
def get_book_by_id(book_id):
    print("Fetching book by ID:", book_id)
    logger.debug("Fetching book ID: %d", book_id)
    book = BookService.get_book_by_id(book_id)
    if book:
        logger.debug("Book fetched: %s", book.title)
        return jsonify(book.to_dict())
    logger.warning("Book not found: %d", book_id)
    return jsonify({'error': 'Book not found'}), 404

@book_controller.route('/books/<int:book_id>', methods=['PUT'])
@jwt_required()
def update_book(book_id):
    """
    Updates an existing book (admin only).
    Body: { title, cover_url, description, rating, summary, authors, categories, total_books, available_books, featured_book }
    """

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        book = BookService.update_book(book_id, data)
        if not book:
            return jsonify({'error': 'Book not found'}), 404

        logger.debug("Book updated: %s", book.title)
        return jsonify(book.to_dict()), 200
    except ValueError as e:
        logger.error("Error updating book: %s", str(e))
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error("Internal error updating book: %s", str(e))
        return jsonify({'error': 'Internal server error'}), 500

@book_controller.route('/books/related', methods=['GET'])
@jwt_required()
def get_related_books():
    logger.debug("Fetching related books")
    
    # Get query parameters
    exclude_id = request.args.get('exclude', type=int)
    limit = request.args.get('limit', 4, type=int)
    categories = request.args.getlist('category')  # Using getlist to get multiple category parameters
    
    logger.debug(f"Related books query params: categories={categories}, exclude={exclude_id}, limit={limit}")
    
    if not categories:
        logger.warning("No categories provided for related books")
        return jsonify({'message': 'No categories provided'}), 400
    
    # Build query for books with matching categories
    query = Book.query.distinct(Book.id)
    
    # Join with categories and filter
    if categories:
        # We need to join with the categories table for each category
        # and ensure the book has at least one matching category
        query = query.join(Book.categories).filter(Category.name.in_(categories))
    
    # Exclude the current book
    if exclude_id:
        query = query.filter(Book.id != exclude_id)
    
    # Order by relevance (number of matching categories) and then by popularity (borrow_count)
    # This is a more complex query that counts matching categories
    
    # First, get all the book IDs that match at least one category
    matching_book_ids = query.with_entities(Book.id).all()
    matching_book_ids = [book_id[0] for book_id in matching_book_ids]
    
    if not matching_book_ids:
        logger.warning("No related books found")
        return jsonify([])
    
    # Now count matching categories for each book and order by that count
    # This requires a more complex query with subqueries
    # For simplicity, we'll use Python to process this
    books_with_category_counts = []
    for book_id in matching_book_ids:
        book = Book.query.get(book_id)
        if book:
            # Count how many requested categories match this book's categories
            matching_category_count = sum(1 for cat in book.categories if cat.name in categories)
            books_with_category_counts.append((book, matching_category_count))
    
    # Sort by matching category count (descending) and then by borrow_count (descending)
    sorted_books = sorted(
        books_with_category_counts, 
        key=lambda x: (x[1], x[0].borrow_count), 
        reverse=True
    )
    
    # Take only the top 'limit' results
    top_related_books = [book for book, _ in sorted_books[:limit]]
    
    logger.debug(f"Related books found: {len(top_related_books)}")
    return jsonify([book.to_dict() for book in top_related_books])