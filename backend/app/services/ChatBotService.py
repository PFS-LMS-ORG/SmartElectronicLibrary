import json
import logging
from typing import Dict, List, Any, Optional
from app import db
from app.model import ChatMessage
from flask import current_app

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ChatBotService:
    def __init__(self, user_id=None):
        from app.services.ChatBot import ChatBot
        self.chatbot = ChatBot(app=current_app, user_id=user_id)

    def chat_with_user(self, message: str, thread_id: str, user_id: int) -> str:
        try:
            
            # Update the user_id in the chatbot instance
            self.chatbot.user_id = user_id
            logger.debug(f"Set chatbot.user_id to {self.chatbot.user_id}")
            
            logger.debug(f"Getting chatbot response for message: {message[:50]}...")
            response = self.chatbot.chat_with_user(message, thread_id)
            return response
        except Exception as e:
            logger.error(f"Error in chat_with_user: {str(e)}")
            fallback_response = {
                "answer": "I apologize, but I encountered an error processing your request.",
                "follow_up_question": "Could you try again with a different question?",
                "recommended_books": None,
                "recommended_articles": None
            }
            return json.dumps(fallback_response)
    
    def _save_chat_message(self, user_id: int, message: str, response: str, language: str, 
                        book_recommendations: Optional[List] = None, 
                        article_recommendations: Optional[List] = None,
                        follow_up_question: Optional[str] = None) -> None:
        """Save chat message to the database."""
        try:
            from app.model.ChatMessage import ChatMessage
            new_chat = ChatMessage(
                user_id=user_id,
                message=message,
                response=response,
                language=language,
                book_recommendations=json.dumps(book_recommendations) if book_recommendations else None,
                article_recommendations=json.dumps(article_recommendations) if article_recommendations else None,
                follow_up_question=follow_up_question if follow_up_question else None
            )
            db.session.add(new_chat)
            db.session.commit()
            logger.debug(f"Saved chat message for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def get_user_chat_history(user_id: int) -> List[Dict[str, Any]]:
        try:
            from flask import current_app
            with current_app.app_context():
                from app.model.ChatMessage import ChatMessage as ChatMessageClass
                chat_messages = db.session.query(ChatMessageClass).filter_by(user_id=user_id).order_by(
                    ChatMessageClass.created_at.desc()).all()
                history = []
                for msg in chat_messages:
                    try:
                        book_recommendations = json.loads(msg.book_recommendations) if msg.book_recommendations else []
                        article_recommendations = json.loads(msg.article_recommendations) if msg.article_recommendations else []
                        follow_up_question = msg.follow_up_question if msg.follow_up_question else None
                    except (json.JSONDecodeError, TypeError):
                        book_recommendations = []
                        article_recommendations = []
                        follow_up_question = None
                    history.append({
                        'id': msg.id,
                        'message': msg.message,
                        'response': msg.response,
                        'language': msg.language,
                        'book_recommendations': book_recommendations,
                        'article_recommendations': article_recommendations,
                        'follow_up_question': follow_up_question,
                        'created_at': msg.created_at.isoformat() if hasattr(msg.created_at, 'isoformat') else str(msg.created_at)
                    })
                return history
        except Exception as e:
            logger.error(f"Error fetching chat history: {str(e)}")
            return []
    
    @staticmethod
    def clear_user_chat_history(user_id: int) -> bool:
        try:
            from app.model.ChatMessage import ChatMessage as ChatMessageClass
            db.session.query(ChatMessageClass).filter_by(user_id=user_id).delete()
            db.session.commit()
            logger.debug(f"Cleared chat history for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing chat history: {str(e)}")
            db.session.rollback()
            return False
    
    def clear_conversation_memory(self, user_id: int) -> bool:
        try:
            thread_id = f"user_{user_id}"
            if hasattr(self.chatbot, 'graph') and hasattr(self.chatbot.graph, 'checkpointer'):
                try:
                    self.chatbot.graph.checkpointer.delete(thread_id)
                    logger.debug(f"Cleared conversation memory for user {user_id}")
                except Exception as e:
                    logger.warning(f"Error clearing checkpointer memory: {str(e)}")
            try:
                if hasattr(self.chatbot.graph, 'state'):
                    keys_to_delete = []
                    for key in self.chatbot.graph.state.keys():
                        if thread_id in key:
                            keys_to_delete.append(key)
                    for key in keys_to_delete:
                        del self.chatbot.graph.state[key]
                        logger.debug(f"Cleared state for key: {key}")
            except Exception as e:
                logger.warning(f"Error clearing graph state: {str(e)}")
            db_success = self.clear_user_chat_history(user_id)
            return db_success
        except Exception as e:
            logger.error(f"Error in clear_conversation_memory: {str(e)}")
            return False
    
    def refresh_vector_store(self) -> bool:
        try:
            if hasattr(self.chatbot, 'load_content_from_db'):
                self.chatbot.vector_store = self.chatbot.load_content_from_db()
                logger.debug("Vector store refreshed successfully")
                return True
            return False
        except Exception as e:
            logger.error(f"Error refreshing vector store: {str(e)}")
            return False    
        
        
        