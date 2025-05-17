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
            thread_id = f"user_{user_id}"
            chatbot_service = ChatBotService()
            response_json = chatbot_service.chat_with_user(message, thread_id)
            try:
                response_data = json.loads(response_json)
            except Exception as e:
                logger.error(f"Error parsing ChatBot response: {str(e)}")
                response_data = {
                    "answer": "Sorry, I couldn't process your request properly.",
                    "follow_up_question": "Can I help you with something else?",
                    "recommended_books": None,
                    "recommended_articles": None
                }
            answer = response_data.get("answer", "")
            follow_up_question = response_data.get("follow_up_question", "")
            recommended_books = response_data.get("recommended_books", [])
            recommended_articles = response_data.get("recommended_articles", [])
            combined_response = answer
            if follow_up_question:
                combined_response += f"\n\n{follow_up_question}"
            if recommended_books is None:
                recommended_books = []
            if recommended_articles is None:
                recommended_articles = []
                
            # Save the chat message with the original data
            chatbot_service._save_chat_message(
                user_id=user_id,
                message=message,
                response=combined_response,
                language=language,
                book_recommendations=recommended_books,
                article_recommendations=recommended_articles
            )
            
            # DEBUG: Log what we're receiving for articles
            if recommended_articles:
                for i, article in enumerate(recommended_articles):
                    logger.debug(f"Article {i} data before formatting: {json.dumps(article)}")
            
            if recommended_books:
                formatted_book_recommendations = []
                for book in recommended_books:
                    formatted_book_recommendations.append({
                        'id': book.get('id', 0),
                        'title': book.get('title', ''),
                        'author': book.get('author', ''),
                        'category': book.get('category', ''),
                        'rating': float(book.get('rating', 0)),
                        'cover_url': book.get('cover_url', ''),
                        'reason': ''
                    })
                recommended_books = formatted_book_recommendations
                
            if recommended_articles:
                formatted_article_recommendations = []
                for article in recommended_articles:
                    # CRITICAL FIX: Ensure we preserve the exact values from the chatbot response
                    formatted_article = {
                        'id': article.get('id', 0),
                        'slug': article.get('slug', ''),
                        'title': article.get('title', ''),
                        'author': article.get('author', ''),
                        'category': article.get('category', ''),
                        'summary': article.get('summary', ''),
                        'pdf_url': article.get('pdf_url', ''),
                        'cover_image_url': article.get('cover_image_url', 'https://placehold.co/600x300'),
                        'read_time': int(article.get('read_time', 5)),
                        'views': int(article.get('views', 0)),
                        'likes': int(article.get('likes', 0)),
                        'reason': ''
                    }
                    # DEBUG: Log what we're returning for this article
                    logger.debug(f"Formatted article: pdf_url={formatted_article['pdf_url']}, cover_image_url={formatted_article['cover_image_url']}")
                    formatted_article_recommendations.append(formatted_article)
                recommended_articles = formatted_article_recommendations
                
            # DEBUG: Log the final response shape
            logger.debug(f"Final response contains {len(recommended_articles)} articles")
            
            return jsonify({
                'response': combined_response,
                'language': language,
                'follow_up_question': follow_up_question,
                'recommended_books': recommended_books,
                'recommended_articles': recommended_articles
            }), 200
        except Exception as e:
            logger.error(f"Error processing chatbot message: {str(e)}")
            logger.error(traceback.format_exc())
            fallback_response = "I'm experiencing some technical difficulties at the moment. Please try again later."
            return jsonify({
                'response': fallback_response,
                'language': language,
                'follow_up_question': "",
                'recommended_books': [],
                'recommended_articles': []
            }), 200
    except Exception as e:
        logger.error(f"Critical error in process_message: {str(e)}")
        return jsonify({'error': 'Server error processing message'}), 500



@chatbot_controller.route('/history', methods=['GET'])
@jwt_required()
def get_chat_history():
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
    try:
        user_id = get_jwt_identity()
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
    try:
        success = ChatBotService().refresh_vector_store()
        if success:
            return jsonify({"message": "Vector store refreshed successfully."}), 200
        else:
            return jsonify({"message": "Vector store refresh not available."}), 404
    except Exception as e:
        logger.error(f"Error refreshing vector store: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@chatbot_controller.route('/health', methods=['GET'])
def health_check():
    try:
        if not os.environ.get("OPENAI_API_KEY") or not os.environ.get("LANGSMITH_API_KEY"):
            return jsonify({
                'status': 'warning',
                'message': 'API keys missing or incomplete',
                'checks': {
                    'openai_api': bool(os.environ.get("OPENAI_API_KEY")),
                    'langsmith_api': bool(os.environ.get("LANGSMITH_API_KEY"))
                }
            }), 200
        chatbot_service = ChatBotService()
        vector_store_ok = hasattr(chatbot_service.chatbot, 'vector_store')
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
        
        
        
        