# backend/app/controllers/email_controller.py

from flask import Blueprint, request, jsonify
from app.services.EmailService import EmailService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.model.User import User
from app.services.RentalRequestService import RentalRequestService
from app.model.AccountRequest import AccountRequest

email_controller = Blueprint('email', __name__)
# Create an instance of EmailService
email_service = EmailService()

@email_controller.route('/send-registration-email', methods=['POST'])
def send_registration_email():
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    action = data.get('action')  # e.g., 'register', 'approve'
    if not email or not name or not action:
        return jsonify({'message': 'Email and name are required'}), 400
    result = email_service.send_email(
        email, 
        'registration', 
        {'userName': name, 'action': action}
    )
    return jsonify(result), 200 if result['success'] else 500

@email_controller.route('/send-account-approval-email', methods=['POST'])
@jwt_required()
def send_account_approval_email():
    data = request.get_json()
    email = data.get('email')
    name = data.get('name')
    action = data.get('action')  # e.g., 'approve'
    
    if not email or not name:
        return jsonify({'message': 'Email and name are required'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    result = email_service.send_email(email, 'account_approved', {'userName': name, 'action': action})
    return jsonify(result), 200 if result['success'] else 500

@email_controller.route('/send-rental-email', methods=['POST'])
@jwt_required()
def send_rental_email():
    data = request.get_json()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    rental_type = data.get('type')  # e.g., 'borrow', 'return', 'deadline'
    book_title = data.get('book_title')
    due_date = data.get('due_date')
    if not rental_type or not book_title:
        return jsonify({'message': 'Type and book title are required'}), 400
    params = {'userName': user.name, 'bookTitle': book_title, 'action': rental_type}
    if due_date:
        params['dueDate'] = f"<strong>Due date:</strong> {due_date}"
    result = email_service.send_email(user.email, 'rental', params)
    return jsonify(result), 200 if result['success'] else 500

@email_controller.route('/send-request-action-email', methods=['POST'])
@jwt_required()
def send_request_action_email():
    data = request.get_json()
    request_id = data.get('request_id')
    action = data.get('action')  # e.g., 'approve', 'reject', 'remove'
    if not request_id or not action:
        return jsonify({'message': 'Request ID and action are required'}), 400
    rental_request = RentalRequestService.get_request_by_id(request_id)
    if not rental_request:
        return jsonify({'message': 'Request not found'}), 404
    if 'book' not in rental_request or 'title' not in rental_request.get('book', {}):
        return jsonify({'message': 'Invalid rental request data'}), 400
    user = User.query.get(rental_request['user_id'])  
    if not user:
        return jsonify({'message': 'User not found'}), 404
    params = {
        'userName': user.name,
        'bookTitle': rental_request.get('book', {}).get('title', 'Unknown'),  # Updated reference
        'action': action
    }
    result = email_service.send_email(user.email, 'request_action', params)
    return jsonify(result), 200 if result['success'] else 500


@email_controller.route('/send-account-request-action-email', methods=['POST'])
@jwt_required()
def send_account_request_action_email():
    data = request.get_json()
    request_id = data.get('request_id')
    action = data.get('action')  # e.g., 'reject', 'delete', 'set-pending'
    if not request_id or not action:
        return jsonify({'message': 'Request ID and action are required'}), 400
    
    account_request = AccountRequest.query.get(request_id)
    if not account_request:
        return jsonify({'message': 'Account request not found'}), 404
    
    user = User.query.filter_by(email=account_request.email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    params = {'userName': user.name, 'action': action}
    result = email_service.send_email(user.email, 'account_action', params)
    return jsonify(result), 200 if result['success'] else 500