from app import create_app
from app.db import db
from app.model.Book import Book
from app.model.Author import Author
from app.model.Category import Category
from app.model.User import User
from app.model.Rental import Rental
from app.model.RentalRequest import RentalRequest
from datetime import datetime, timedelta
import json

app = create_app()

with app.app_context():
    # Drop all existing data and recreate tables
    db.drop_all()
    db.create_all()

    # Load scraped books from JSON
    try:
        with open("books.json", "r", encoding="utf-8") as f:
            scraped_books = json.load(f)
    except FileNotFoundError:
        print("❌ scraped_books.json not found")
        scraped_books = []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in scraped_books.json: {e}")
        scraped_books = []

    # Process authors (deduplicate)
    author_dict = {}
    for book_data in scraped_books:
        author_name = book_data.get("author", "Unknown Author")
        if author_name not in author_dict:
            author_dict[author_name] = Author(name=author_name)

    # Process categories (deduplicate)
    category_dict = {}
    for book_data in scraped_books:
        category_name = book_data.get("category", "Uncategorized")
        if category_name not in category_dict:
            category_dict[category_name] = Category(name=category_name)

    # Create books and link authors/categories
    books = []
    for book_data in scraped_books:
        book = Book(
            title=book_data.get("title", "Untitled"),
            cover_url=book_data.get("cover_url", "https://via.placeholder.com/150"),
            description=book_data.get("description", "No description available."),
            rating=book_data.get("rating", 4.0),
            summary=book_data.get("summary", "No summary available."),
            borrow_count=book_data.get("borrow_count", 0),
            total_books=book_data.get("total_books", 10),
            available_books=book_data.get("available_books", 10),
            featured_book=book_data.get("featured_book", False)
        )

        # Link author
        author_name = book_data.get("author", "Unknown Author")
        book.authors.append(author_dict[author_name])

        # Link category
        category_name = book_data.get("category", "Uncategorized")
        book.categories.append(category_dict[category_name])

        books.append(book)

    # Add all authors, categories, and books to the database session
    db.session.add_all(list(author_dict.values()) + list(category_dict.values()) + books)

    # Add mock users with email and password
    user1 = User(name="Alice", email="alice@example.com")
    user1.set_password("password123")
    user2 = User(name="Bob", email="bob@example.com")
    user2.set_password("password123")
    user3 = User(name="Charlie", email="charlie@example.com", role="admin")
    user3.set_password("password123")

    # Add rentals (use first few books to avoid index errors)
    rentals = []
    if books:
        rental1 = Rental(user=user1, book=books[0], rented_at=datetime.utcnow() - timedelta(days=3))
        books[0].available_books -= 1
        books[0].borrow_count += 1
        rentals.append(rental1)

    if len(books) > 1:
        rental2 = Rental(
            user=user2,
            book=books[1],
            rented_at=datetime.utcnow() - timedelta(days=10),
            returned_at=datetime.utcnow() - timedelta(days=2)
        )
        books[1].borrow_count += 1
        rentals.append(rental2)

    if len(books) > 2:
        rental3 = Rental(user=user3, book=books[2], rented_at=datetime.utcnow() - timedelta(days=1))
        books[2].available_books -= 1
        books[2].borrow_count += 1
        rentals.append(rental3)

    # Add rental requests
    rental_requests = []
    if books:
        request1 = RentalRequest(
            user=user1,
            book=books[0],
            requested_at=datetime.utcnow() - timedelta(days=5),
            status='pending'
        )
        rental_requests.append(request1)

    if len(books) > 1:
        request2 = RentalRequest(
            user=user2,
            book=books[1],
            requested_at=datetime.utcnow() - timedelta(days=7),
            status='approved'
        )
        rental_requests.append(request2)

    if len(books) > 2:
        request3 = RentalRequest(
            user=user3,
            book=books[2],
            requested_at=datetime.utcnow() - timedelta(days=2),
            status='rejected'
        )
        rental_requests.append(request3)

    if len(books) > 3:
        request4 = RentalRequest(
            user=user1,
            book=books[3],
            requested_at=datetime.utcnow() - timedelta(days=1),
            status='pending'
        )
        rental_requests.append(request4)

    # Add all users, rentals, and rental requests to the session
    db.session.add_all([user1, user2, user3] + rentals + rental_requests)

    # Commit all changes
    try:
        db.session.commit()
        print(f"🌱 Database seeded successfully with {len(books)} books")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Seeding failed: {str(e)}")