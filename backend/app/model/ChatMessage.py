# app/model/ChatMessage.py
from app.db import db
from datetime import datetime

class ChatMessage(db.Model):
    """Model for storing chat messages"""
    __tablename__ = "chat_messages"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(2), default="en")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "response": self.response,
            "language": self.language,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }