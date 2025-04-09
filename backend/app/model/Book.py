from app.db import db
from app.model.association_tables import book_author_association, book_category_association

class Book(db.Model):
    __tablename__ = "books"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    cover_url = db.Column(db.String(255))
    description = db.Column(db.String(500)) 
    rating = db.Column(db.Float)  
    summary = db.Column(db.String(1000)) 

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
            'categories': [category.name for category in self.categories]
        }
