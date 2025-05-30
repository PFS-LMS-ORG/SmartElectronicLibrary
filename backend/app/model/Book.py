from app.db import db
from app.model.association_tables import book_author_association, book_category_association
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    cover_url = db.Column(db.String(255))
    description = db.Column(db.String(500))
    rating = db.Column(db.Float)
    summary = db.Column(db.Text)
    borrow_count = db.Column(db.Integer, default=0)  # Number of times the book has been borrowed 
    total_books = db.Column(db.Integer, default=0)  # Total number of copies of the book available
    available_books = db.Column(db.Integer, default=0)  # Number of copies currently available for borrowing
    featured_book = db.Column(db.Boolean, default=False)  # Whether the book is featured or not
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    authors = db.relationship(
        "Author",
        secondary=book_author_association,
        back_populates="books"
    )

    categories = db.relationship(
        "Category",
        secondary=book_category_association,
        back_populates="books"
    )

    rentals = db.relationship("Rental", back_populates="book")
    rental_requests = db.relationship("RentalRequest", back_populates="book")

    def __repr__(self):
        return f"<Book {self.title}> by {', '.join([author.name for author in self.authors])}"

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'cover_url': self.cover_url,
            'description': self.description,
            'rating': self.rating,
            'summary': self.summary,
            'authors': [author.name for author in self.authors],
            'categories': [category.name for category in self.categories],
            'borrow_count': self.borrow_count,
            'total_books': self.total_books,
            'available_books': self.available_books,
            'featured_book': self.featured_book,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
