import os
from flask import Blueprint, request, jsonify
from app.services.ChatBotService import ChatBotService
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import traceback
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

chatbot_controller = Blueprint('chatbot_controller', __name__)

@chatbot_controller.route('/message', methods=['POST'])
@jwt_required()
def process_message():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data.get('message')
        language = data.get('language', 'en')
        
        logger.debug(f"Processing chatbot message: {message[:50]}... in {language}")
        
        try:
            # Get thread ID based on user ID
            thread_id = f"user_{user_id}"
            
            # Call the ChatBot service
            chatbot_service = ChatBotService()
            response_json = chatbot_service.chat_with_user(message, thread_id)
            
            # Try to parse the JSON response
            try:
                response_data = json.loads(response_json) if isinstance(response_json, str) else response_json
            except Exception as e:
                logger.error(f"Error parsing ChatBot response: {str(e)}")
                response_data = {
                    "answer": "Sorry, I couldn't process your request properly.",
                    "follow_up_question": "Can I help you with something else?",
                    "recommended_books": None,
                    "recommended_articles": None 
                }
            
            # Extract data from the response
            answer = response_data.get("answer", "")
            follow_up_question = response_data.get("follow_up_question", "")
            recommended_books = response_data.get("recommended_books", [])
            recommended_articles = response_data.get("recommended_articles", []) 
            
            # Convert None values to empty lists
            if recommended_books is None:
                recommended_books = []
                
            if recommended_articles is None:
                recommended_articles = []
                
            # Combine answer and follow-up question for the main response
            combined_response = answer
            if follow_up_question:
                combined_response += f"\n\n{follow_up_question}"
            
            # Save the chat message to database
            chatbot_service._save_chat_message(
                user_id=user_id,
                message=message,
                response=combined_response,
                language=language,
                book_recommendations=recommended_books,  # Pass the objects directly
                article_recommendations=recommended_articles  # Pass the objects directly
            )
            
            # Format book recommendations
            if recommended_books:
                formatted_books = []
                for book in recommended_books:
                    # Handle both dictionary and object formats
                    if not isinstance(book, dict):
                        # It's an object, convert to dict
                        if hasattr(book, "__dict__"):
                            book = book.__dict__
                        elif hasattr(book, "model_dump"):  # Pydantic model
                            book = book.model_dump()
                        elif hasattr(book, "dict"):  # Older Pydantic
                            book = book.dict()
                    
                    # Ensure all fields are present
                    book_obj = {
                        'id': book.get('book_id', 0),
                        'title': book.get('title', ''),
                        'authors': book.get('authors', []),
                        'categories': book.get('categories', []),
                        'rating': book.get('rating', 0),
                        'cover_url': book.get('cover_url', ''),
                        'description': book.get('description', ''),
                        'summary': book.get('summary', ''),
                        'available_books': book.get('available_books', 0),
                        'total_books': book.get('total_books', 0),
                        'featured_book': book.get('featured_book', False),
                        'borrow_count': book.get('borrow_count', 0),
                        'reason': ''
                    }
                    formatted_books.append(book_obj)
                recommended_books = formatted_books
                
            # Format article recommendations
            if recommended_articles:
                formatted_articles = []
                for article in recommended_articles:
                    # Handle both dictionary and object formats
                    if not isinstance(article, dict):
                        # It's an object, convert to dict
                        if hasattr(article, "__dict__"):
                            article = article.__dict__
                        elif hasattr(article, "model_dump"):  # Pydantic model
                            article = article.model_dump()
                        elif hasattr(article, "dict"):  # Older Pydantic
                            article = article.dict()
                    
                    # Handle author field
                    author_info = article.get('author', {})
                    if isinstance(author_info, dict):
                        author_name = author_info.get('name', '')
                        author_avatar = author_info.get('avatarUrl', '')
                    else:
                        author_name = str(author_info) if author_info else ''
                        author_avatar = ''
                    
                    # Create the article object with all fields
                    article_obj = {
                        'id': article.get('article_id', 0),
                        'title': article.get('title', ''),
                        'category': article.get('category', ''),
                        'author': author_name,
                        'author_avatar': author_avatar,
                        'summary': article.get('summary', ''),
                        'pdf_url': article.get('pdf_url', ''),
                        'cover_image_url': article.get('cover_image_url', ''),
                        'tags': article.get('tags', []),
                        'created_at': article.get('created_at', ''),
                        'updated_at': article.get('updated_at', None),
                        'read_time': article.get('meta', {}).get('readTime', 5) if article.get('meta') else 5,
                        'views': article.get('meta', {}).get('views', 0) if article.get('meta') else 0,
                        'likes': article.get('meta', {}).get('likes', 0) if article.get('meta') else 0,
                        'bookmarks': article.get('meta', {}).get('bookmarks', 0) if article.get('meta') else 0,
                        'reason': ''
                    }
                    formatted_articles.append(article_obj)
                recommended_articles = formatted_articles

            return jsonify({
                'response': combined_response,
                'language': language,
                'follow_up_question': follow_up_question,
                'recommended_books': recommended_books,
                'recommended_articles': recommended_articles
            }), 200

        except Exception as e:
            # Log the full traceback for detailed debugging
            logger.error(f"Error processing chatbot message: {str(e)}")
            logger.error(traceback.format_exc())
            
            # For errors, return a 500 status
            fallback_response = "I'm experiencing some technical difficulties at the moment. Please try again later."
            
            return jsonify({
                'response': fallback_response,
                'language': language,
                'follow_up_question': "",
                'recommended_books': [],
                'recommended_articles': []  # Add this line
            }), 200
            
    except Exception as e:
        logger.error(f"Critical error in process_message: {str(e)}")
        return jsonify({'error': 'Server error processing message'}), 500







@chatbot_controller.route('/history', methods=['GET'])
@jwt_required()
def get_chat_history():
    """
    Get chat history for the current user.
    """
    try:
        user_id = get_jwt_identity()
        history = ChatBotService.get_user_chat_history(user_id)
        return jsonify({'chat_history': history}), 200
    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        return jsonify({'error': 'Server error fetching chat history'}), 500


@chatbot_controller.route('/clear', methods=['POST'])
@jwt_required()
def clear_chat_history():
    """
    Clear chat history and conversation memory for the current user.
    """
    try:
        user_id = get_jwt_identity()
        
        # Try to clear both history and memory
        success = ChatBotService().clear_conversation_memory(user_id)
        
        if success:
            return jsonify({'message': 'Chat history cleared successfully'}), 200
        else:
            return jsonify({'message': 'Chat history partially cleared'}), 200
            
    except Exception as e:
        logger.error(f"Critical error in clear_chat_history: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Server error clearing chat history'}), 500


@chatbot_controller.route('/refresh-vector-store', methods=['POST'])
@jwt_required()
def refresh_vector_store():
    """
    Refresh the vector store by reloading all books from the database.
    """
    try:
        success = ChatBotService().refresh_vector_store()
        
        if success:
            return jsonify({"message": "Vector store refreshed successfully."}), 200
        else:
            return jsonify({"message": "Vector store refresh not available."}), 404
            
    except Exception as e:
        # Log the full error with traceback
        logger.error(f"Error refreshing vector store: {str(e)}")
        logger.error(traceback.format_exc())
        
        return jsonify({"error": str(e)}), 500

@chatbot_controller.route('/health', methods=['GET'])
def health_check():
    """
    Check if the chatbot service is healthy.
    """
    try:
        # Check if API keys are available
        if not os.environ.get("OPENAI_API_KEY") or not os.environ.get("LANGSMITH_API_KEY"):
            return jsonify({
                'status': 'warning',
                'message': 'API keys missing or incomplete',
                'checks': {
                    'openai_api': bool(os.environ.get("OPENAI_API_KEY")),
                    'langsmith_api': bool(os.environ.get("LANGSMITH_API_KEY"))
                }
            }), 200
        
        # Check if the chatbot service can be initialized
        chatbot_service = ChatBotService()
        
        # Check if vector store is initialized
        vector_store_ok = hasattr(chatbot_service.chatbot, 'vector_store')
        
        # Check if graph is initialized
        graph_ok = hasattr(chatbot_service.chatbot, 'graph')
        
        all_ok = vector_store_ok and graph_ok
        
        return jsonify({
            'status': 'healthy' if all_ok else 'degraded',
            'message': 'Chatbot service is running properly' if all_ok else 'Some components are not initialized',
            'checks': {
                'vector_store': vector_store_ok,
                'graph': graph_ok
            }
        }), 200
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'message': f'Chatbot service error: {str(e)}',
            'checks': {
                'error': str(e)
            }
        }), 500



