# app/model/ChatMessage.py

from app.db import db
from datetime import datetime
import json
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ChatMessage(db.Model):
    """Model for storing chat messages with book and article recommendations"""
    __tablename__ = "chat_messages"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(2), default="en")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    book_recommendations = db.Column(db.Text, nullable=True)  # Store as JSON string
    article_recommendations = db.Column(db.Text, nullable=True)  # Store as JSON string
    follow_up_question = db.Column(db.Text, nullable=True)
    
    # Add relationship to User for easier querying
    user = db.relationship("User", back_populates="chat_messages")
    
    def to_dict(self):
        """Convert the ChatMessage to a dictionary, including all relevant fields."""
        # Process book recommendations
        try:
            if self.book_recommendations:
                if isinstance(self.book_recommendations, str):
                    book_recs = json.loads(self.book_recommendations)
                else:
                    book_recs = self.book_recommendations
            else:
                book_recs = []
                
            # Ensure book_recommendations is a list
            if not isinstance(book_recs, list):
                book_recs = [book_recs] if isinstance(book_recs, dict) else []
                
            # Validate book recommendations
            validated_book_recs = []
            for rec in book_recs:
                if not isinstance(rec, dict):
                    continue
                validated_book_recs.append({
                    "id": int(rec.get("id", 0)),
                    "title": str(rec.get("title", "Unknown Title")),
                    "author": str(rec.get("author", "Unknown Author")),
                    "category": str(rec.get("category", "Uncategorized")),
                    "rating": float(rec.get("rating", 0.0)),
                    "cover_url": str(rec.get("cover_url", "")),
                    "reason": str(rec.get("reason", ""))
                })
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse book_recommendations for ChatMessage {self.id}: {e}")
            validated_book_recs = []
        except Exception as e:
            logger.error(f"Unexpected error processing book_recommendations for ChatMessage {self.id}: {e}")
            validated_book_recs = []
        
        # Process article recommendations
        try:
            if self.article_recommendations:
                if isinstance(self.article_recommendations, str):
                    article_recs = json.loads(self.article_recommendations)
                else:
                    article_recs = self.article_recommendations
            else:
                article_recs = []
                
            # Ensure article_recommendations is a list
            if not isinstance(article_recs, list):
                article_recs = [article_recs] if isinstance(article_recs, dict) else []
                
            # Validate article recommendations
            validated_article_recs = []
            for rec in article_recs:
                if not isinstance(rec, dict):
                    continue
                validated_article_recs.append({
                    "id": int(rec.get("id", 0)),
                    "slug": str(rec.get("slug", "")),
                    "title": str(rec.get("title", "Unknown Title")),
                    "author": str(rec.get("author", "Unknown Author")),
                    "category": str(rec.get("category", "Uncategorized")),
                    "summary": str(rec.get("summary", "")),
                    "pdf_url": str(rec.get("pdf_url", "")),
                    "cover_image_url": str(rec.get("cover_image_url", "https://placehold.co/600x300")),
                    "read_time": int(rec.get("read_time", 5)),
                    "views": int(rec.get("views", 0)),
                    "likes": int(rec.get("likes", 0)),
                    "reason": str(rec.get("reason", ""))
                })
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse article_recommendations for ChatMessage {self.id}: {e}")
            validated_article_recs = []
        except Exception as e:
            logger.error(f"Unexpected error processing article_recommendations for ChatMessage {self.id}: {e}")
            validated_article_recs = []
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "response": self.response,
            "language": self.language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "book_recommendations": validated_book_recs,
            "article_recommendations": validated_article_recs,
            "follow_up_question": self.follow_up_question if self.follow_up_question else ""
        }
    
    def __repr__(self):
        return f"<ChatMessage id={self.id} user_id={self.user_id} language={self.language}>"