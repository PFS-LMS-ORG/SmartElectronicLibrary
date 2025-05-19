from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.NotificationService import NotificationService
from app.model.User import User

notification_controller = Blueprint('notification_controller', __name__)

@notification_controller.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """
    Get notifications for the current user.
    Query params: 
        - limit (optional): Maximum number of notifications to return
        - unread_only (optional): Whether to return only unread notifications
    """
    user_id = get_jwt_identity()
    limit = request.args.get('limit', type=int)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    notifications = NotificationService.get_user_notifications(
        user_id=user_id, 
        limit=limit,
        unread_only=unread_only
    )
    return jsonify([notification.to_dict() for notification in notifications]), 200

@notification_controller.route('/notifications/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """
    Get count of unread notifications for the current user.
    """
    user_id = get_jwt_identity()
    notifications = NotificationService.get_user_notifications(user_id, unread_only=True)
    unread_count = len(notifications)
    return jsonify({'unread_count': unread_count}), 200

@notification_controller.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """
    Mark a notification as read.
    """
    notification = NotificationService.mark_as_read(notification_id)
    if notification:
        return jsonify(notification.to_dict()), 200
    return jsonify({'error': 'Notification not found'}), 404

@notification_controller.route('/notifications/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """
    Mark all notifications as read for the current user.
    """
    user_id = get_jwt_identity()
    count = NotificationService.mark_all_as_read(user_id)
    return jsonify({'marked_count': count}), 200

@notification_controller.route('/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """
    Delete a notification.
    """
    result = NotificationService.delete_notification(notification_id)
    if result:
        return jsonify({'message': 'Notification deleted'}), 200
    return jsonify({'error': 'Notification not found'}), 404

@notification_controller.route('/admin/notifications', methods=['POST'])
@jwt_required()
def create_system_notification():
    """
    Create a system notification for all users or specific users.
    Body: { "message": str, "user_ids": list[int] (optional) }
    """
    # Check if admin
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
        
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Message is required'}), 400
        
    if 'user_ids' in data and isinstance(data['user_ids'], list):
        # Send to specific users
        for uid in data['user_ids']:
            NotificationService.create_notification(
                user_id=uid,
                type='info',
                message=data['message']
            )
        return jsonify({'message': f'Notification sent to {len(data["user_ids"])} users'}), 200
    else:
        # Send to all users
        users = User.query.all()
        for user in users:
            NotificationService.create_notification(
                user_id=user.id,
                type='info',
                message=data['message']
            )
        return jsonify({'message': f'Notification sent to all users ({len(users)})'}), 200


