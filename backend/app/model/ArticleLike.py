from app.db import db
from datetime import datetime

class ArticleLike(db.Model):
    __tablename__ = 'article_likes'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.id'), primary_key=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship('User', back_populates='liked_articles')
    article = db.relationship('Article', back_populates='likes')

    def __repr__(self):
        return f"<ArticleLike user_id={self.user_id} article_id={self.article_id}>"