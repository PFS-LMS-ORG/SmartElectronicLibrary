# backend/app/controllers/account_requests_controller.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.services.UserService import UserService
import logging
from app.services.EmailService import EmailService
from app.model.AccountRequest import AccountRequest
from app.model.User import User

# Initialize EmailService
email_service = EmailService()


# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

account_requests_bp = Blueprint('account_requests', __name__)

@account_requests_bp.route('/account-requests', methods=['GET'])
@jwt_required()
def get_account_requests():
    try:
        logger.debug("Fetching account requests")
        
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        status = request.args.get('status', 'all')
        search = request.args.get('search', '').strip()
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 5), 50)  # Between 5 and 50
        
        # Get paginated account requests
        requests_data, total_count, total_pages = UserService.get_paginated_account_requests(
            page=page,
            per_page=per_page,
            status=status,
            search=search
        )
        
        # Return the response with pagination data
        return jsonify({
            'requests': [req.to_dict() for req in requests_data],
            'total_count': total_count,
            'total_pages': total_pages,
            'page': page,
            'per_page': per_page
        }), 200
    except Exception as e:
        logger.error("Error fetching account requests: %s", str(e))
        return jsonify({'message': 'Server error'}), 500



@account_requests_bp.route('/account-requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
def approve_account_request(request_id):
    try:
        logger.debug("Approving account request %s", request_id)
            
        user = UserService.approve_account_request(request_id)
        if not user:
            return jsonify({'message': 'Request not found or already processed'}), 404
                
        
        # Send email notification
        # -----------------------------------------------------------------------------------------
        # Direct EmailService call:
        result = email_service.send_email(
            user.email, 
            'account_approved', 
            {'userName': user.name, 'action': 'approve'}
        )
        if not result['success']:
            logger.error("Failed to send approval email: %s", result['message'])
        # -----------------------------------------------------------------------------------------
        
                
        return jsonify({
            'message': 'Account approved and created',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        logger.error("Error approving account request: %s", str(e))
        return jsonify({'message': 'Server error'}), 500


@account_requests_bp.route('/account-requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
def reject_account_request(request_id):
    try:
        logger.debug("Rejecting account request %s", request_id)
        
        # Get the account request info before rejecting it
        account_request = AccountRequest.query.get(request_id)
        if not account_request:
            return jsonify({'message': 'Request not found'}), 404
            
        success = UserService.reject_account_request(request_id)
        if not success:
            return jsonify({'message': 'Request already processed'}), 404
        
        # Send email notification
        # -----------------------------------------------------------------------------------------
        # Direct EmailService call:
        result = email_service.send_email(
            account_request.email,
            'account_action', 
            {'userName': account_request.name, 'action': 'reject'}
        )
        if not result['success']:
            logger.error("Failed to send rejection email: %s", result['message'])
        # -----------------------------------------------------------------------------------------
        
        return jsonify({'message': 'Account request rejected'}), 200
    except Exception as e:
        logger.error("Error rejecting account request: %s", str(e))
        return jsonify({'message': 'Server error'}), 500


    
@account_requests_bp.route('/account-requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_account_request(request_id):
    try:
        logger.debug("Deleting account request %s", request_id)
        
        # Get the account request info before deleting it
        account_request = AccountRequest.query.get(request_id)
        if not account_request:
            return jsonify({'message': 'Request not found'}), 404
            
        success = UserService.reject_account_request(request_id)  # Reuse reject logic for DELETE
        if not success:
            return jsonify({'message': 'Request already processed'}), 404
        
        # Send email notification
        # -----------------------------------------------------------------------------------------
        # Direct EmailService call:
        result = email_service.send_email(
            account_request.email,
            'account_action', 
            {'userName': account_request.name, 'action': 'delete'}
        )
        if not result['success']:
            logger.error("Failed to send deletion email: %s", result['message'])
        # -----------------------------------------------------------------------------------------
        
        return jsonify({'message': 'Account request deleted'}), 200
    except Exception as e:
        logger.error("Error deleting account request: %s", str(e))
        return jsonify({'message': 'Server error'}), 500

@account_requests_bp.route('/account-requests/<int:request_id>/set-pending', methods=['POST'])
@jwt_required()
def set_pending_account_request(request_id):
    try:
        logger.debug("Setting account request %s to pending", request_id)
        success = UserService.set_account_request_pending(request_id)
        if not success:
            return jsonify({'message': 'Request not found'}), 404
        
        # Send email notification
        # -----------------------------------------------------------------------------------------
        # Get the account request to find the user's email
        account_request = AccountRequest.query.get(request_id)
        if account_request:
            # Get the user associated with the email in the account request
            user = User.query.filter_by(email=account_request.email).first()
            if user:
                result = email_service.send_email(
                    user.email,
                    'account_action',
                    {'userName': user.name, 'action': 'set-pending'}
                )
                if not result['success']:
                    logger.error("Failed to send pending email: %s", result['message'])
            else:
                logger.error("User not found for account request ID: %s", request_id)
        else:
            logger.error("Account request not found: %s", request_id)
        # -----------------------------------------------------------------------------------------
        
        return jsonify({'message': 'Account request status updated to pending'}), 200
    except Exception as e:
        logger.error("Error updating account request status: %s", str(e))
        return jsonify({'message': 'Server error'}), 500