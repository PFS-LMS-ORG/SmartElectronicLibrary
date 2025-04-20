from app.db import db
from app.model.association_tables import book_category_association

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)

    books = db.relationship(
        "Book",
        secondary=book_category_association,
        back_populates="categories"
    )

    def __repr__(self):
        return f"<Category {self.name}> "
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'books': [book.title for book in self.books]
        }
