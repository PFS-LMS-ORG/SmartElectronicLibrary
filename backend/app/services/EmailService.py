import os
import requests
from app.db import db
import logging
import dotenv

# Configure logging for debugging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # Load environment variables from .env file
        dotenv.load_dotenv()
        self.user_id = os.environ.get('EMAILJS_USER_ID')
        self.service_id = os.environ.get('EMAILJS_SERVICE_ID')
        self.template_1_id = os.environ.get('EMAILJS_TEMPLATE_1_ID')  # Registration/Approval
        self.template_2_id = os.environ.get('EMAILJS_TEMPLATE_2_ID')  # Rental/Request Actions
        self.access_token = os.environ.get('EMAILJS_ACCESS_TOKEN')  # Load access token
        self.url = "https://api.emailjs.com/api/v1.0/email/send"
        self.from_email = os.environ.get('EMAIL_FROM', 'no-reply@yourdomain.com')

        # Validate required environment variables
        if not all([self.user_id, self.service_id, self.access_token]):
            logger.error("Missing required EmailJS credentials: user_id, service_id, or access_token")
            raise ValueError("Missing required EmailJS credentials")

    def transform_action(self, action):
        """Transform action verbs into past tense and capitalize them."""
        action_map = {
            "register": "Registered",
            "approve": "Approved",
            "reject": "Rejected",
            "delete": "Deleted",
            "set-pending": "Set to Pending",
            "borrow": "Borrowed",
            "return": "Returned",
            "deadline": "Due Soon",
            "remove": "Removed"
        }
        # Return the transformed action if in the map, otherwise capitalize the original
        return action_map.get(action.lower(), action.capitalize())

    def send_email(self, to_email, notification_type, params):
        # Determine which template to use
        # Template 1: All account-related actions (registration, approval, rejection, etc.)
        # Template 2: Something else (like rental/borrowing actions, etc.)
        using_account_template = notification_type in ['registration', 'account_approved', 'account_action']
        template_id = self.template_1_id if using_account_template else self.template_2_id
        
        # Transform the action if it exists in params
        transformed_params = params.copy()
        if 'action' in transformed_params:
            transformed_params['action'] = self.transform_action(transformed_params['action'])
        
        # For account-related emails (Template 1)
        if using_account_template:
            # For new registrations
            if notification_type == 'registration':
                transformed_params.update({
                    'showLoginButton': 'hidden',
                    'headerColor': '#1e293b',  # Default blue/slate
                    'additionalMessage': 'Your account request has been submitted and is pending admin approval. We will notify you once it has been reviewed.'
                })
            # For approved accounts
            elif notification_type == 'account_approved':
                transformed_params.update({
                    'showLoginButton': 'visible',
                    'headerColor': '#047857',  # Green
                    'additionalMessage': 'Please log in to explore our digital collection and start borrowing books. If you have any questions, feel free to contact our support team.'
                })
            # For account actions (reject, delete, set-pending)
            elif notification_type == 'account_action':
                action = params.get('action', '')
                # Always hide login button for these actions
                transformed_params['showLoginButton'] = 'hidden'
                
                if action == 'reject':
                    transformed_params.update({
                        'headerColor': '#b91c1c',  # Red
                        'additionalMessage': 'Unfortunately, your account request has been rejected. If you believe this is a mistake, please contact our support team for assistance.'
                    })
                elif action == 'delete':
                    transformed_params.update({
                        'headerColor': '#6b7280',  # Grey
                        'additionalMessage': 'Your account request has been removed from our system. If you wish to apply again, please submit a new registration.'
                    })
                elif action == 'set-pending':
                    transformed_params.update({
                        'headerColor': '#f59e0b',  # Amber
                        'additionalMessage': 'Your account request has been set to pending status and will be reviewed by our administrators soon.'
                    })
                else:
                    # Default
                    transformed_params.update({
                        'headerColor': '#1e293b',  # Default blue/slate
                        'additionalMessage': 'Thank you for using our service.'
                    })
        else:
            # Template 2 - Activity and Request Updates
            # Set action-specific colors and text
            action = params.get('action', '').lower()
            
            if action == 'borrow' or action == 'borrowed':
                transformed_params.update({
                    'headerColor': '#047857',  # Green
                    'headerColorDark': '#065f46',
                    'accentColor': '#10b981',
                    'accentColorDark': '#059669',
                    'statusText': 'Book Borrowed'
                })
            elif action == 'return' or action == 'returned':
                transformed_params.update({
                    'headerColor': '#1d4ed8',  # Blue
                    'headerColorDark': '#1e40af',
                    'accentColor': '#3b82f6',
                    'accentColorDark': '#2563eb',
                    'statusText': 'Book Returned'
                })
            elif action == 'delete' or action == 'deleted' or action == 'remove' or action == 'removed':
                transformed_params.update({
                    'headerColor': '#6b7280',  # Gray
                    'headerColorDark': '#4b5563',
                    'accentColor': '#9ca3af',
                    'accentColorDark': '#6b7280',
                    'statusText': 'Request Removed'
                })
            elif action == 'reject' or action == 'rejected':
                transformed_params.update({
                    'headerColor': '#b91c1c',  # Red
                    'headerColorDark': '#991b1b',
                    'accentColor': '#ef4444',
                    'accentColorDark': '#dc2626',
                    'statusText': 'Request Rejected'
                })
            elif action == 'approve' or action == 'approved':
                transformed_params.update({
                    'headerColor': '#047857',  # Green
                    'headerColorDark': '#065f46',
                    'accentColor': '#10b981',
                    'accentColorDark': '#059669',
                    'statusText': 'Request Approved'
                })
            else:
                # Default colors (amber)
                transformed_params.update({
                    'headerColor': '#f59e0b',  # Amber
                    'headerColorDark': '#d97706',
                    'accentColor': '#f59e0b',
                    'accentColorDark': '#d97706',
                    'statusText': 'Status Update'
                })
        
        # Create payload
        payload = {
            "service_id": self.service_id,
            "template_id": template_id,
            "user_id": self.user_id,
            "accessToken": self.access_token,
            "template_params": {
                "to_email": self.from_email,
                "email": to_email,
                **transformed_params
            }
        }
        
        try:
            logger.debug("Sending email with payload: %s", payload)  # Log the payload for debugging
            response = requests.post(self.url, json=payload)
            response.raise_for_status()
            logger.info("Email sent successfully to %s", to_email)
            return {"success": True, "message": "Email sent successfully"}
        except requests.exceptions.RequestException as e:
            error_message = f"Failed to send email: {str(e)}"
            if hasattr(e, 'response') and e.response is not None:
                error_message += f" - Response: {e.response.text}"
            logger.error(error_message)
            return {"success": False, "message": error_message}