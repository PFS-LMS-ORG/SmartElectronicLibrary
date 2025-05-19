from app import create_app
from app.db import db
from app.model import Book, Author, Category, User, Rental, RentalRequest, Article, ArticleAuthor, ArticleMeta, ArticleLike, ArticleBookmark
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token
import json
from slugify import slugify
import random
import string

app = create_app()

# Helper function to generate unique slugs
def generate_unique_slug(base_slug, existing_slugs):
    """Generate a unique slug by adding a random suffix if needed."""
    if base_slug not in existing_slugs:
        return base_slug
    
    # If slug exists, add a random suffix
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    new_slug = f"{base_slug}-{random_suffix}"
    
    # Recursively check until we get a unique slug
    return generate_unique_slug(new_slug, existing_slugs)

with app.app_context():
    # Drop all existing data and recreate tables
    db.drop_all()
    db.create_all()

    # Load scraped books from JSON
    try:
        with open("books.json", "r", encoding="utf-8") as f:
            scraped_books = json.load(f)
    except FileNotFoundError:
        print("❌ books.json not found")
        scraped_books = []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in books.json: {e}")
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
    
    # Generate a long-lived token for user3 (service account)
    service_token = create_access_token(identity=str(user3.id), expires_delta=timedelta(days=365))
    print(f"🌱 Generated service token for user3 (Charlie): {service_token}")
    print("Please add the following to your .env file as EMAILJS_SERVICE_TOKEN:")
    print(f"EMAILJS_SERVICE_TOKEN={service_token}")

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

    # Load scraped articles from JSON (use formatted_articles.json from article_scraper.py)
    try:
        with open("formatted_articles.json", "r", encoding="utf-8") as f:
            scraped_articles = json.load(f)
        print(f"🔍 Loaded {len(scraped_articles)} articles from formatted_articles.json")
    except FileNotFoundError:
        print("❌ formatted_articles.json not found, trying articles.json...")
        try:
            with open("articles.json", "r", encoding="utf-8") as f:
                scraped_articles = json.load(f)
            print(f"🔍 Loaded {len(scraped_articles)} articles from articles.json")
        except FileNotFoundError:
            print("❌ No article JSON files found, falling back to dummy data")
            scraped_articles = []
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in articles.json: {e}")
            scraped_articles = []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in formatted_articles.json: {e}")
        scraped_articles = []

    # Add a default Unknown Author for fallback
    article_author_dict = {"Unknown Author": ArticleAuthor(name="Unknown Author", avatar_url=None)}
    
    # First, create a mapping of authors
    for article_data in scraped_articles:
        # Handle different author field structures based on your scraped data format
        if isinstance(article_data.get("author"), dict):
            # Format: {"author": {"name": "Author Name", "avatarUrl": "url"}}
            author_name = article_data["author"].get("name", "Unknown Author")
            avatar_url = article_data["author"].get("avatarUrl")
        elif isinstance(article_data.get("author"), str):
            # Format: {"author": "Author Name"}
            author_name = article_data["author"]
            avatar_url = None
        else:
            # Default fallback
            author_name = "Unknown Author"
            avatar_url = None
            
        if author_name not in article_author_dict:
            article_author_dict[author_name] = ArticleAuthor(
                name=author_name,
                avatar_url=avatar_url
            )

    # Create articles and link authors/meta
    articles = []
    existing_slugs = set()  # Keep track of existing slugs to avoid duplicates
    
    for article_data in scraped_articles:
        # Generate base slug
        if not article_data.get("slug"):
            base_slug = slugify(article_data.get("title", "Untitled"))
        else:
            base_slug = article_data["slug"]
        
        # Generate a unique slug
        article_slug = generate_unique_slug(base_slug, existing_slugs)
        existing_slugs.add(article_slug)
            
        # Handle created_at and updated_at dates
        try:
            if article_data.get("createdAt"):
                created_at = datetime.fromisoformat(article_data["createdAt"].replace('Z', '+00:00'))
            else:
                created_at = datetime.utcnow()
                
            if article_data.get("updatedAt") and article_data["updatedAt"]:
                updated_at = datetime.fromisoformat(article_data["updatedAt"].replace('Z', '+00:00'))
            else:
                updated_at = None
        except ValueError:
            # Handle date format errors
            print(f"⚠️ Invalid date format for article: {article_data.get('title')}")
            created_at = datetime.utcnow()
            updated_at = None
            
        # Create article with pdf_url instead of content
        article = Article(
            title=article_data.get("title", "Untitled"),
            slug=article_slug,  # Use the unique slug
            cover_image_url=article_data.get("coverImageUrl") or article_data.get("cover_image_url", "https://placehold.co/600x300"),
            category=article_data.get("category", "Uncategorized"),
            summary=article_data.get("summary", "No summary available."),
            pdf_url=article_data.get("pdfUrl", ""),  # Use pdfUrl instead of content
            tags=article_data.get("tags", []),
            created_at=created_at,
            updated_at=updated_at
        )

        # Link author - handle different author data structures
        if isinstance(article_data.get("author"), dict):
            author_name = article_data["author"].get("name", "Unknown Author")
        elif isinstance(article_data.get("author"), str):
            author_name = article_data["author"]
        else:
            author_name = "Unknown Author"
            
        article.author = article_author_dict.get(author_name, article_author_dict["Unknown Author"])

        # Create meta - handle different meta data structures
        meta_data = article_data.get("meta", {})
        if isinstance(meta_data, dict):
            read_time = meta_data.get("readTime", 5)
            views = meta_data.get("views", 0)
            likes_count = meta_data.get("likes", 0)
            bookmarks_count = meta_data.get("bookmarks", 0)
        else:
            # For arxiv papers, estimate read time based on summary length
            summary_length = len(article_data.get("summary", ""))
            read_time = max(5, int(summary_length / 200))  # Rough estimate: 200 chars per minute
            views = 0
            likes_count = 0
            bookmarks_count = 0
            
        meta = ArticleMeta(
            read_time=read_time,
            views=views,
            likes_count=likes_count,
            bookmarks_count=bookmarks_count
        )
        article.meta = meta

        articles.append(article)

    # Add sample likes and bookmarks 
    likes = []
    bookmarks = []
    if articles:
        # User1 likes and bookmarks first article
        likes.append(ArticleLike(user=user1, article=articles[0]))
        bookmarks.append(ArticleBookmark(user=user1, article=articles[0]))
        
    if len(articles) > 1:
        # User1 likes second article
        likes.append(ArticleLike(user=user1, article=articles[1]))
        
    if len(articles) > 2:
        # User2 likes third article
        likes.append(ArticleLike(user=user2, article=articles[2]))

    # Add all article authors, articles, likes, and bookmarks to the session
    db.session.add_all(list(article_author_dict.values()) + articles + likes + bookmarks)

    # Commit all changes
    try:
        db.session.commit()
        print(f"🌱 Database seeded successfully with {len(books)} books and {len(articles)} articles")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Seeding failed: {str(e)}")