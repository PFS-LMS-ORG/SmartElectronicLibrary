from flask import Blueprint, request, jsonify
from app.services.ChatBotService import ChatBotService
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

chatbot_controller = Blueprint('chatbot_controller', __name__)

@chatbot_controller.route('/message', methods=['POST'])
@jwt_required()
def process_message():
    """
    Process an incoming chat message and return a response.
    
    Expected request body:
    {
        "message": "User's message text",
        "language": "en" | "fr" | "ar"
    }
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data.get('message')
        language = data.get('language', 'en')
        
        logger.debug(f"Processing chatbot message: {message[:50]}... in {language}")
        
        response = ChatBotService().get_chatbot_response(user_id, message, language)
        
        return jsonify({
            'response': response['response'],
            'language': language,
            'book_recommendations': response['book_recommendations']
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing chatbot message: {str(e)}")
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
        # Clear chat history from database
        ChatBotService.clear_user_chat_history(user_id)
        # Clear conversation memory
        ChatBotService().clear_conversation_memory(user_id)
        return jsonify({'message': 'Chat history cleared successfully'}), 200
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        return jsonify({'error': 'Server error clearing chat history'}), 500
    

@chatbot_controller.route('/refresh-vector-store', methods=['POST'])
@jwt_required()
def refresh_vector_store():
    try:
        ChatBotService().refresh_vector_store()
        return jsonify({"message": "Vector store refreshed successfully."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500