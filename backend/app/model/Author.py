from app.db import db
from app.model.association_tables import book_author_association

class Author(db.Model):
    __tablename__ = "authors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    books = db.relationship(
        "Book",
        secondary=book_author_association,
        back_populates="authors"
    )

    def __repr__(self):
        return f"<Author {self.name}>"
