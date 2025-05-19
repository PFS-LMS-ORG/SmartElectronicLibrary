from app.db import db
from datetime import datetime

class Article(db.Model):
    __tablename__ = 'articles'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    cover_image_url = db.Column(db.String(255), nullable=True, default="https://placehold.co/600x300")
    category = db.Column(db.String(50), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('article_authors.id'), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    pdf_url = db.Column(db.String(255), nullable=False)  # Replaced content with pdf_url
    tags = db.Column(db.JSON, nullable=False, default=[])
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=True)

    author = db.relationship('ArticleAuthor', back_populates='articles')
    meta = db.relationship('ArticleMeta', back_populates='article', uselist=False, cascade="all, delete-orphan")
    likes = db.relationship('ArticleLike', back_populates='article', cascade="all, delete-orphan")
    bookmarks = db.relationship('ArticleBookmark', back_populates='article', cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Article {self.title}>"

    def to_dict(self):
        return {
            'id': str(self.id),
            'title': self.title,
            'slug': self.slug,
            'coverImageUrl': self.cover_image_url,
            'category': self.category,
            'author': self.author.to_dict(),
            'summary': self.summary,
            'pdfUrl': self.pdf_url,  # Replaced content with pdfUrl
            'tags': self.tags,
            'createdAt': self.created_at.isoformat() + 'Z',
            'updatedAt': self.updated_at.isoformat() + 'Z' if self.updated_at else None,
            'meta': self.meta.to_dict()
        }