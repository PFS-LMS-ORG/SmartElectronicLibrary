from app.db import db
from datetime import datetime

class ArticleView(db.Model):
    __tablename__ = 'article_views'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    article_meta_id = db.Column(db.Integer, db.ForeignKey('article_meta.id'), nullable=False)
    viewed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    article_meta = db.relationship('ArticleMeta', back_populates='view_records')

    def __repr__(self):
        return f"<ArticleView user_id={self.user_id} article_meta_id={self.article_meta_id}>"
    
    
    