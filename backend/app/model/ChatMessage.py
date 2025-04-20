# app/model/ChatMessage.py

from app.db import db
from datetime import datetime
import json
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ChatMessage(db.Model):
    """Model for storing chat messages with book recommendations"""
    __tablename__ = "chat_messages"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(2), default="en")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    book_recommendations = db.Column(db.Text, nullable=True)  # Store as JSON string
    
    # Add relationship to User for easier querying
    user = db.relationship("User", back_populates="chat_messages")
    
    def to_dict(self):
        """Convert the ChatMessage to a dictionary, safely handling book_recommendations."""
        try:
            # Make sure book_recommendations are properly parsed
            if self.book_recommendations:
                if isinstance(self.book_recommendations, str):
                    book_recs = json.loads(self.book_recommendations)
                else:
                    # If somehow it's already a dict or list, just use it
                    book_recs = self.book_recommendations
            else:
                book_recs = []
                
            # Ensure book_recommendations is a list
            if not isinstance(book_recs, list):
                if isinstance(book_recs, dict):
                    book_recs = [book_recs]
                else:
                    book_recs = []
                    
            # Validate each recommendation has required fields
            validated_recs = []
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
                
                validated_recs.append(processed_rec)
                
            book_recs = validated_recs
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse book_recommendations for ChatMessage {self.id}: {e}")
            book_recs = []
        except Exception as e:
            logger.error(f"Unexpected error processing book_recommendations for ChatMessage {self.id}: {e}")
            book_recs = []
        
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "response": self.response,
            "language": self.language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "book_recommendations": book_recs
        }
    
    def __repr__(self):
        return f"<ChatMessage id={self.id} user_id={self.user_id} language={self.language}>"