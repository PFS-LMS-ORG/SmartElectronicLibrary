from app.model.Notification import Notification
from app.db import db

class NotificationService:
    @staticmethod
    def create_notification(user_id, type, message):
        """
        Create a new notification for a user.
        
        Args:
            user_id (int): User ID
            type (str): Notification type (welcome, borrow-accepted, borrow-rejected, info)
            message (str): Notification message
            
        Returns:
            Notification: Created notification object
        """
        notification = Notification(
            user_id=user_id,
            type=type,
            message=message
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    @staticmethod
    def get_user_notifications(user_id, limit=None, unread_only=False):
        """
        Get notifications for a specific user, optionally limited and filtered by read status.
        
        Args:
            user_id (int): User ID
            limit (int, optional): Maximum number of notifications to return
            unread_only (bool, optional): Whether to return only unread notifications
            
        Returns:
            list: List of notification objects
        """
        query = Notification.query.filter_by(user_id=user_id)
        
        # Filter by read status if requested
        if unread_only:
            query = query.filter_by(read=False)
            
        # Order by creation date, newest first
        query = query.order_by(Notification.created_at.desc())
        
        # Apply limit if specified
        if limit:
            query = query.limit(limit)
            
        return query.all()
    
    @staticmethod
    def mark_as_read(notification_id):
        """
        Mark a notification as read.
        
        Args:
            notification_id (int): Notification ID
            
        Returns:
            Notification: Updated notification object
        """
        notification = Notification.query.get(notification_id)
        if notification:
            notification.read = True
            db.session.commit()
        return notification
    
    @staticmethod
    def mark_all_as_read(user_id):
        """
        Mark all notifications for a user as read.
        
        Args:
            user_id (int): User ID
            
        Returns:
            int: Number of notifications marked as read
        """
        notifications = Notification.query.filter_by(user_id=user_id, read=False).all()
        count = len(notifications)
        for notification in notifications:
            notification.read = True
        db.session.commit()
        return count
    
    @staticmethod
    def delete_notification(notification_id):
        """
        Delete a notification.
        
        Args:
            notification_id (int): Notification ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        notification = Notification.query.get(notification_id)
        if notification:
            db.session.delete(notification)
            db.session.commit()
            return True
        return False
    
    
    