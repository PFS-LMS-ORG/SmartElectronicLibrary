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
    
    # Add relationship to User for easier querying
    user = db.relationship("User", back_populates="chat_messages")
    
    def to_dict(self):
        """Convert the ChatMessage to a dictionary, safely handling book and article recommendations."""
        try:
            # Process book recommendations
            if self.book_recommendations:
                if isinstance(self.book_recommendations, str):
                    book_recs = json.loads(self.book_recommendations)
                else:
                    book_recs = self.book_recommendations
            else:
                book_recs = []
                
            # Ensure book_recommendations is a list
            if not isinstance(book_recs, list):
                if isinstance(book_recs, dict):
                    book_recs = [book_recs]
                else:
                    book_recs = []
                    
            # Validate each book recommendation
            validated_book_recs = []
            for rec in book_recs:
                # Skip invalid recommendations
                if not isinstance(rec, dict):
                    continue
                    
                # Ensure all fields have appropriate types
                processed_rec = {}
                
                # Process title
                processed_rec["title"] = str(rec.get("title", "Unknown Title"))
                
                # Process author
                processed_rec["author"] = str(rec.get("author", "Unknown Author"))
                
                # Process category
                processed_rec["category"] = str(rec.get("category", "Uncategorized"))
                
                # Process rating - ensure it's a float
                try:
                    processed_rec["rating"] = float(rec.get("rating", 0.0))
                except (ValueError, TypeError):
                    processed_rec["rating"] = 0.0
                    
                # Process book_id - ensure it's an integer
                try:
                    processed_rec["book_id"] = int(rec.get("book_id", 0))
                except (ValueError, TypeError):
                    processed_rec["book_id"] = 0
                    
                # Process cover_url
                processed_rec["cover_url"] = str(rec.get("cover_url", "/default_cover.jpg"))
                
                # Process reason
                processed_rec["reason"] = str(rec.get("reason", "Recommended based on your interests"))
                
                validated_book_recs.append(processed_rec)
                
            book_recs = validated_book_recs
            
            # Process article recommendations - new code
            if self.article_recommendations:
                if isinstance(self.article_recommendations, str):
                    article_recs = json.loads(self.article_recommendations)
                else:
                    article_recs = self.article_recommendations
            else:
                article_recs = []
                
            # Ensure article_recommendations is a list
            if not isinstance(article_recs, list):
                if isinstance(article_recs, dict):
                    article_recs = [article_recs]
                else:
                    article_recs = []
                    
            # Validate each article recommendation
            validated_article_recs = []
            for rec in article_recs:
                # Skip invalid recommendations
                if not isinstance(rec, dict):
                    continue
                    
                # Ensure all fields have appropriate types
                processed_rec = {}
                
                # Process title
                processed_rec["title"] = str(rec.get("title", "Unknown Title"))
                
                # Process author (could be a string or a dict)
                author = rec.get("author", {})
                if isinstance(author, dict):
                    processed_rec["author"] = str(author.get("name", "Unknown Author"))
                else:
                    processed_rec["author"] = str(author or "Unknown Author")
                
                # Process category
                processed_rec["category"] = str(rec.get("category", "Uncategorized"))
                
                # Process article_id - ensure it's an integer
                try:
                    processed_rec["article_id"] = int(rec.get("article_id", 0))
                except (ValueError, TypeError):
                    processed_rec["article_id"] = 0
                    
                # Process cover_image_url
                processed_rec["cover_image_url"] = str(rec.get("cover_image_url", "/default_article_cover.jpg"))
                
                # Process pdf_url
                processed_rec["pdf_url"] = str(rec.get("pdf_url", ""))
                
                # Process summary
                processed_rec["summary"] = str(rec.get("summary", "No summary available"))
                
                # Process reason
                processed_rec["reason"] = str(rec.get("reason", "Recommended based on your interests"))
                
                # Process meta info if available
                meta = rec.get("meta", {})
                if isinstance(meta, dict):
                    processed_rec["read_time"] = int(meta.get("readTime", 5))
                    processed_rec["views"] = int(meta.get("views", 0))
                    processed_rec["likes"] = int(meta.get("likes", 0))
                
                validated_article_recs.append(processed_rec)
                
            article_recs = validated_article_recs
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse recommendations for ChatMessage {self.id}: {e}")
            book_recs = []
            article_recs = []
        except Exception as e:
            logger.error(f"Unexpected error processing recommendations for ChatMessage {self.id}: {e}")
            book_recs = []
            article_recs = []
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "response": self.response,
            "language": self.language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "book_recommendations": book_recs,
            "article_recommendations": article_recs
        }
    
    def __repr__(self):
        return f"<ChatMessage id={self.id} user_id={self.user_id} language={self.language}>"