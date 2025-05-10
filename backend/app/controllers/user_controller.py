from flask import Blueprint, request, jsonify
from app.services.UserService import UserService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.model.User import User

user_controller = Blueprint('user_controller', __name__)

@user_controller.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    # Get pagination parameters
    page = request.args.get('page', default=1, type=int)
    per_page = request.args.get('per_page', default=10, type=int)
    search = request.args.get('search', default='', type=str)
    role = request.args.get('role', default=None, type=str)
    
    # Limit per_page to reasonable values
    per_page = min(max(per_page, 1), 50)  # Between 1 and 50
    
    # Check if user is admin before returning all users
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Get paginated users from service
    users, total_count, total_pages = UserService.get_paginated_users(
        page=page, 
        per_page=per_page,
        search=search,
        role=role
    )
    
    # Return paginated response
    return jsonify({
        'users': [user.to_dict() for user in users],
        'total_count': total_count,
        'total_pages': total_pages,
        'page': page,
        'per_page': per_page
    }), 200

@user_controller.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(user_id):
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@user_controller.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    # Check if user is admin
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role = data.get('role', 'user')
    
    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400
        
    # Check if email already exists
    if UserService.get_user_by_email(email):
        return jsonify({'error': 'Email already in use'}), 400
    
    user = UserService.create_user(name, email, role)
    return jsonify(user.to_dict()), 201

@user_controller.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    # Check if user is admin or updating themselves
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or (current_user.role != 'admin' and current_user.id != user_id):
        return jsonify({'error': 'Unauthorized access'}), 403
    
    data = request.get_json()
    
    # If not admin, cannot change role
    if current_user.role != 'admin' and data.get('role'):
        return jsonify({'error': 'Cannot change role'}), 403
    
    # Only admins can change another user's role to admin
    if current_user.role != 'admin' and data.get('role') == 'admin':
        return jsonify({'error': 'Cannot assign admin role'}), 403
    
    user = UserService.update_user(
        user_id,
        name=data.get('name'),
        email=data.get('email'),
        role=data.get('role')
    )
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@user_controller.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    # Check if user is admin
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Prevent deleting admin users
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user.role == 'admin':
        return jsonify({'error': 'Admin users cannot be deleted'}), 403
    
    # Prevent deleting yourself
    if user_id == current_user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 403
        
    success = UserService.delete_user(user_id)
    if not success:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify({'message': 'User deleted successfully'}), 200