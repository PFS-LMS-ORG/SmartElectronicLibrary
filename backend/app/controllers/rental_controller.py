from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.RentalService import RentalService
from app.model.User import User
from sqlalchemy.exc import IntegrityError

rental_controller = Blueprint('rental_controller', __name__)

def check_admin():
    """Helper to verify if the current user is an admin."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    return None

@rental_controller.route('/rentals', methods=['POST'])
@jwt_required()
def create_rental():
    """
    Create a new rental (admin only).
    Body: { "user_id": int, "book_id": int }
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check

        data = request.get_json()
        if not data or 'user_id' not in data or 'book_id' not in data:
            return jsonify({'error': 'user_id and book_id are required'}), 400

        rental = RentalService.create_rental(data['user_id'], data['book_id'], update_book=True)
        return jsonify(rental.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except IntegrityError:
        return jsonify({'error': 'Failed to create rental'}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@rental_controller.route('/rentals', methods=['GET'])
@jwt_required()
def get_all_rentals():
    """
    Get all rentals with pagination and filters (admin only).
    Query params:
        - page (default=1): Page number for pagination
        - per_page (default=10): Number of items per page
        - status (optional): Filter by rental status ('active', 'returned', 'all')
        - search (optional): Search term to filter by user name, email, or book title
    Returns:
        JSON response with rentals, total count, and total pages
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
        valid_statuses = ['all', 'active', 'returned']
        if status not in valid_statuses:
            return jsonify({'error': f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

        # Pass parameters to the service layer
        result = RentalService.get_all_rentals(page, per_page, status, search)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500


@rental_controller.route('/rentals/<int:rental_id>', methods=['GET'])
@jwt_required()
def get_rental(rental_id):
    """
    Get a specific rental by ID.
    """
    try:
        user_id = get_jwt_identity()
        rental = RentalService.get_rental_by_id(rental_id)
        
        # Allow access if user owns the rental or is admin
        user = User.query.get(user_id)
        if rental.user_id != user_id and user.role != 'admin':
            return jsonify({'error': 'Unauthorized access'}), 403
            
        return jsonify(rental.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_controller.route('/rentals/<int:rental_id>', methods=['PUT'])
@jwt_required()
def update_rental(rental_id):
    """
    Update a rental's details (admin only).
    Body: { "user_id": int, "book_id": int, "rented_at": str, "returned_at": str|null }
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        rental = RentalService.update_rental(rental_id, data)
        return jsonify(rental.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except IntegrityError:
        return jsonify({'error': 'Failed to update rental'}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_controller.route('/rentals/<int:rental_id>', methods=['DELETE'])
@jwt_required()
def delete_rental(rental_id):
    """
    Delete a rental (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check

        result = RentalService.delete_rental(rental_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_controller.route('/rentals/bulk', methods=['DELETE'])
@jwt_required()
def bulk_delete_rentals():
    """
    Delete multiple rentals (admin only).
    Body: { "rental_ids": [int] }
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check

        data = request.get_json()
        if not data or 'rental_ids' not in data or not isinstance(data['rental_ids'], list):
            return jsonify({'error': 'rental_ids array is required'}), 400

        result = RentalService.bulk_delete_rentals(data['rental_ids'])
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_controller.route('/rentals/active', methods=['GET'])
@jwt_required()
def get_active_rentals():
    """
    Get all active (unreturned) rentals (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check
        
        rentals = RentalService.get_active_rentals()
        return jsonify({'rentals': rentals}), 200
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_controller.route('/rentals/<int:rental_id>/return', methods=['PUT'])
@jwt_required()
def return_rental(rental_id):
    """
    Mark a rental as returned (admin only).
    """
    try:
        admin_check = check_admin()
        if admin_check:
            return admin_check
        
        rental = RentalService.return_book(rental_id)
        if not rental:
            return jsonify({'error': 'Rental not found'}), 404
        return jsonify(rental.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@rental_controller.route('/rentals/my_rentals', methods=['GET'])
@jwt_required()
def get_my_rentals():
    """
    Get the current user's rentals with pagination.
    Query params: page (default=1), per_page (default=10)
    """
    try:
        user_id = get_jwt_identity()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        rentals = RentalService.get_user_rentals(user_id)
        # Paginate manually for simplicity
        total_count = len(rentals)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_rentals = rentals[start:end]
        
        return jsonify({
            'rentals': [rental.to_dict() for rental in paginated_rentals],
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page,
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500
    

@rental_controller.route('/rentals/specific_rental/<int:user_id>/<int:book_id>', methods=['GET'])
@jwt_required()
def get_specific_rental(user_id, book_id):
    """
    Get a specific rental by user_id and book_id.
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        rental = RentalService.get_user_book_rental(user_id, book_id)
        if not rental:
            return jsonify({'error': 'Rental not found'}), 404
        
        return jsonify(rental.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500