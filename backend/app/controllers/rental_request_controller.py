from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.model.User import User
from app.services.RentalRequestService import RentalRequestService
from sqlalchemy.exc import SQLAlchemyError

rental_request_controller = Blueprint('rental_request_controller', __name__)

def check_admin():
    """Helper to verify if the current user is an admin."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    return None

@rental_request_controller.route('/rental_requests', methods=['POST'])
@jwt_required()
def create_rental_request():
    """
    Create a new rental request.
    Body: { "book_id": int }
    """
    try:
        data = request.get_json()
        if not data or 'book_id' not in data:
            return jsonify({'error': 'book_id is required'}), 400
        
        user_id = get_jwt_identity()
        rental_request = RentalRequestService.create_request(user_id, data['book_id'])
        return jsonify(rental_request), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests/pending', methods=['GET'])
@jwt_required()
def get_pending_requests():
    """
    Get all pending rental requests (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check
        
        requests = RentalRequestService.get_pending_requests()
        return jsonify({'requests': requests}), 200
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests', methods=['GET'])
@jwt_required()
def get_all_requests():
    """
    Get all rental requests with pagination and filters (admin only).
    Query params:
        - page (default=1): Page number for pagination
        - per_page (default=10): Number of items per page
        - status (optional): Filter by request status ('pending', 'approved', 'rejected', 'all')
        - search (optional): Search term to filter by user name, email, or book title
    Returns:
        JSON response with rental requests, total count, and total pages
    """
    try:
        # Check if user is admin
        admin_check = check_admin()
        if admin_check:
            return admin_check

        # Extract query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        status = request.args.get('status', 'all')  # Default to 'all' if not provided
        search = request.args.get('search', '').strip()  # Default to empty string if not provided

        # Validate status parameter
        valid_statuses = ['all', 'pending', 'approved', 'rejected']
        if status not in valid_statuses:
            return jsonify({'error': f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        # Pass parameters to the service layer
        result = RentalRequestService.get_all_requests(page, per_page, status, search)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500
    

@rental_request_controller.route('/rental_requests/my_requests', methods=['GET'])
@jwt_required()
def get_my_requests():
    """
    Get the current user's rental requests with pagination.
    Query params: page (default=1), per_page (default=10)
    """
    try:
        user_id = get_jwt_identity()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        result = RentalRequestService.get_user_requests(user_id, page, per_page)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests/<int:request_id>', methods=['GET'])
@jwt_required()
def get_rental_request(request_id):
    """
    Get a specific rental request by ID.
    """
    try:
        user_id = get_jwt_identity()
        request_data = RentalRequestService.get_request_by_id(request_id)
        
        # Allow access if user owns the request or is admin
        user = User.query.get(user_id)
        if request_data['user_id'] != user_id and user.role != 'admin':
            return jsonify({'error': 'Unauthorized access'}), 403
            
        return jsonify(request_data), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests/<int:request_id>/approve', methods=['PUT'])
@jwt_required()
def approve_rental_request(request_id):
    """
    Approve a rental request, create a rental, and update book (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check
        
        request_data = RentalRequestService.approve_request(request_id)
        return jsonify(request_data), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests/<int:request_id>/reject', methods=['PUT'])
@jwt_required()
def reject_rental_request(request_id):
    """
    Reject a rental request (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check
        
        request_data = RentalRequestService.reject_request(request_id)
        return jsonify(request_data), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
def cancel_rental_request(request_id):
    """
    Cancel a rental request (user's own request).
    """
    try:
        user_id = get_jwt_identity()
        result = RentalRequestService.cancel_request(request_id, user_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_request_controller.route('/rental_requests/requested_books', methods=['GET'])
@jwt_required()
def get_requested_books():
    """
    Get all books with pending rental requests (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check
        
        books = RentalRequestService.get_all_requested_books()
        return jsonify({'books': books}), 200
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500