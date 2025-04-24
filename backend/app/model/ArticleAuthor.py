from app.db import db

class ArticleAuthor(db.Model):
    __tablename__ = 'article_authors'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(255), nullable=True)

    articles = db.relationship('Article', back_populates='author')

    def __repr__(self):
        return f"<ArticleAuthor {self.name}>"

    def to_dict(self):
        return {
            'name': self.name,
            'avatarUrl': self.avatar_url
        }