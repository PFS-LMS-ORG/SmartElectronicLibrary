# backend/app/controllers/user_controller.py
from flask import Blueprint, request, jsonify
from app.services.UserService import UserService 

user_controller = Blueprint('user_controller', __name__)

@user_controller.route('/users', methods=['GET'])
def get_all_users():
    users = UserService.get_all_users()
    return jsonify([user.to_dict() for user in users]), 200

@user_controller.route('/users/<int:user_id>', methods=['GET'])
def get_user_by_id(user_id):
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@user_controller.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    role = data.get('role', 'user')

    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400

    user = UserService.create_user(name, email, role)
    return jsonify(user.to_dict()), 201

@user_controller.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json()
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
def delete_user(user_id):
    success = UserService.delete_user(user_id)
    if not success:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'message': 'User deleted successfully'}), 200