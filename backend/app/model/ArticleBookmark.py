from app.db import db
from datetime import datetime

class ArticleBookmark(db.Model):
    __tablename__ = 'article_bookmarks'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.id'), primary_key=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship('User', back_populates='bookmarked_articles')
    article = db.relationship('Article', back_populates='bookmarks')

    def __repr__(self):
        return f"<ArticleBookmark user_id={self.user_id} article_id={self.article_id}>"