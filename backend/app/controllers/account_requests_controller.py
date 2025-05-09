# backend/app/controllers/account_requests_controller.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.UserService import UserService
import logging
import requests

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

account_requests_bp = Blueprint('account_requests', __name__)

@account_requests_bp.route('/account-requests', methods=['GET'])
@jwt_required()
def get_account_requests():
    try:
        logger.debug("Fetching account requests")
        requests = UserService.get_account_requests()
        return jsonify([req.to_dict() for req in requests]), 200
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
        # Get the JWT token from the incoming request
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.error("No Authorization header found in the request")
        else:
            headers = {'Authorization': auth_header}
            response = requests.post('http://localhost:5050/email/send-account-approval-email', json={
                'request_id': request_id
            }, headers=headers)
            if response.status_code != 200:
                logger.error("Failed to send approval email: %s", response.text)            
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
        success = UserService.reject_account_request(request_id)
        if not success:
            return jsonify({'message': 'Request not found or already processed'}), 404
        
        # Send email notification
        # -----------------------------------------------------------------------------------------
        # Get the JWT token from the incoming request
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.error("No Authorization header found in the request")
        else:
            headers = {'Authorization': auth_header}
            response = requests.post('http://localhost:5050/email/send-account-request-action-email', json={
                'request_id': request_id,
                'action': 'reject'
            }, headers=headers)
            if response.status_code != 200:
                logger.error("Failed to send rejection email: %s", response.text)
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
        success = UserService.reject_account_request(request_id)  # Reuse reject logic for DELETE
        if not success:
            return jsonify({'message': 'Request not found or already processed'}), 404
        
        # Send email notification
        # -----------------------------------------------------------------------------------------
        # Get the JWT token from the incoming request
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.error("No Authorization header found in the request")
        else:
            headers = {'Authorization': auth_header}
            response = requests.post('http://localhost:5050/email/send-account-request-action-email', json={
                'request_id': request_id,
                'action': 'delete'
            }, headers=headers)
            if response.status_code != 200:
                logger.error("Failed to send deletion email: %s", response.text)
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
        # Get the JWT token from the incoming request
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logger.error("No Authorization header found in the request")
        else:
            headers = {'Authorization': auth_header}
            response = requests.post('http://localhost:5050/email/send-account-request-action-email', json={
                'request_id': request_id,
                'action': 'set-pending'
            }, headers=headers)
            if response.status_code != 200:
                logger.error("Failed to send pending email: %s", response.text)
        # -----------------------------------------------------------------------------------------
        
        return jsonify({'message': 'Account request status updated to pending'}), 200
    except Exception as e:
        logger.error("Error updating account request status: %s", str(e))
        return jsonify({'message': 'Server error'}), 500