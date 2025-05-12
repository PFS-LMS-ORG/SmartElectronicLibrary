from app.db import db
from datetime import datetime

class ArticleMeta(db.Model):
    __tablename__ = 'article_meta'

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.id'), nullable=False, unique=True)
    read_time = db.Column(db.Integer, nullable=False, default=5)  # in minutes
    views = db.Column(db.Integer, nullable=False, default=0)  # Integer column for view count
    likes_count = db.Column(db.Integer, nullable=False, default=0)
    bookmarks_count = db.Column(db.Integer, nullable=False, default=0)

    article = db.relationship('Article', back_populates='meta', uselist=False)
    view_records = db.relationship('ArticleView', back_populates='article_meta', cascade="all, delete-orphan")  # Renamed relationship

    def __repr__(self):
        return f"<ArticleMeta article_id={self.article_id}>"

    def to_dict(self):
        return {
            'readTime': self.read_time,
            'views': self.views,
            'likes': self.likes_count,
            'bookmarks': self.bookmarks_count
    }        