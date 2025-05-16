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
    """
    Service layer for chatbot functionality.
    Acts as a bridge between the controller and the ChatBot implementation.
    """
    
    def __init__(self):
        # Import ChatBot here to avoid circular imports
        from app.services.ChatBot import ChatBot
        # Pass the Flask app for context
        self.chatbot = ChatBot(app=current_app)
    
    def chat_with_user(self, message: str, thread_id: str) -> str:
        """
        Get a response from the chatbot for a user message.
        
        Args:
            message (str): The user's message
            thread_id (str): The unique thread identifier for the conversation
            
        Returns:
            str: JSON string containing the structured response
        """
        try:
            logger.debug(f"Getting chatbot response for message: {message[:50]}...")
            
            # Call the ChatBot's chat_with_user method
            response = self.chatbot.chat_with_user(message, thread_id)
            
            # If it's already a JSON string, return it
            if isinstance(response, str):
                try:
                    # Try to parse and validate the JSON
                    response_data = json.loads(response)
                    return response
                except json.JSONDecodeError:
                    # Not valid JSON, continue with processing
                    pass
                    
            # Handle the case when response is a Python object
            try:
                if hasattr(response, "model_dump_json"):  # Pydantic v2
                    # It's a Pydantic model
                    return response.model_dump_json()
                elif hasattr(response, "json"):  # Pydantic v1
                    # It's a Pydantic model (older version)
                    return response.json()
                elif hasattr(response, "__dict__"):
                    # It's a regular Python object
                    return json.dumps(response.__dict__)
                else:
                    # Just try to convert it to JSON
                    return json.dumps(response)
            except Exception as e:
                logger.error(f"Error converting response to JSON: {str(e)}")
                
                # Fallback to a simple structure
                return json.dumps({
                    "answer": str(response) if response else "I'm sorry, I encountered an error processing your request.",
                    "follow_up_question": "Could you try again with a different question?",
                    "recommended_books": None,
                    "recommended_articles": None
                })
                
        except Exception as e:
            logger.error(f"Error in chat_with_user: {str(e)}")
            
            # Return a fallback response
            return json.dumps({
                "answer": "I apologize, but I encountered an error processing your request.",
                "follow_up_question": "Could you try again with a different question?",
                "recommended_books": None,
                "recommended_articles": None
            })
        
    
    
    def _save_chat_message(self, user_id: int, message: str, response: str, language: str, 
                        book_recommendations: Optional[List] = None,
                        article_recommendations: Optional[List] = None):
        try:
            
            from app.model.ChatMessage import ChatMessage
            
            new_chat = ChatMessage(
                user_id=user_id,
                message=message,
                response=response,
                language=language,
                book_recommendations=json.dumps(book_recommendations) if book_recommendations else None,
                article_recommendations=json.dumps(article_recommendations) if article_recommendations else None
            )
            db.session.add(new_chat)
            db.session.commit()
            logger.debug(f"Saved chat message for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            db.session.rollback()
    
    @staticmethod
    def get_user_chat_history(user_id: int) -> List[Dict[str, Any]]:
        """
        Get chat history for a specific user.
        
        Args:
            user_id (int): User ID
            
        Returns:
            List of chat message dictionaries
        """
        try:
            # Import Flask's current_app to get application context
            from flask import current_app
            
            with current_app.app_context():
                # Make sure we're querying the ChatMessage class, not module
                from app.model.ChatMessage import ChatMessage as ChatMessageClass
                
                chat_messages = db.session.query(ChatMessageClass).filter_by(user_id=user_id).order_by(
                    ChatMessageClass.created_at.desc()).all()
                
                history = []
                for msg in chat_messages:
                    try:
                        book_recommendations = json.loads(msg.book_recommendations) if msg.book_recommendations else []
                        article_recommendations = json.loads(msg.article_recommendations) if msg.article_recommendations else []
                    except (json.JSONDecodeError, TypeError):
                        book_recommendations = []
                        article_recommendations = []
                    
                    history.append({
                        'id': msg.id,
                        'message': msg.message,
                        'response': msg.response,
                        'language': msg.language,
                        'book_recommendations': book_recommendations,
                        'article_recommendations': article_recommendations,
                        'created_at': msg.created_at.isoformat() if hasattr(msg.created_at, 'isoformat') else str(msg.created_at)
                    })
                
                return history
        except Exception as e:
            logger.error(f"Error fetching chat history: {str(e)}")
            return []
    
    
    @staticmethod
    def clear_user_chat_history(user_id: int) -> bool:
        """
        Clear chat history for a specific user from the database.
        
        Args:
            user_id (int): User ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Make sure we're querying the ChatMessage class, not module
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
        """
        Clear the conversation memory for a specific user.
        
        Args:
            user_id (int): User ID
            
        Returns:
            bool: True if successful
        """
        try:
            thread_id = f"user_{user_id}"
            
            # Clear the graph checkpointer if available
            if hasattr(self.chatbot, 'graph') and hasattr(self.chatbot.graph, 'checkpointer'):
                try:
                    self.chatbot.graph.checkpointer.delete(thread_id)
                    logger.debug(f"Cleared conversation memory for user {user_id}")
                except Exception as e:
                    logger.warning(f"Error clearing checkpointer memory: {str(e)}")
            
            # Clear any additional state that might be stored in memory
            # This depends on how LangGraph keeps conversation state
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
            
            # Clear database history
            db_success = self.clear_user_chat_history(user_id)
            
            return db_success
        except Exception as e:
            logger.error(f"Error in clear_conversation_memory: {str(e)}")
            return False
    
    
    def refresh_vector_store(self) -> bool:
        """
        Refresh the vector store by reloading all books from the database.
        
        Returns:
            bool: True if successful
        """
        try:
            if hasattr(self.chatbot, 'load_books_from_db'):
                self.chatbot.vector_store = self.chatbot.load_books_from_db()
                logger.debug("Vector store refreshed successfully")
                return True
            return False
        except Exception as e:
            logger.error(f"Error refreshing vector store: {str(e)}")
            return False
        
        
        
        