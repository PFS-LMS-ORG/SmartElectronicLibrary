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
        template_id = self.template_1_id if notification_type in ['registration', 'account_approved'] else self.template_2_id
        # Transform the action if it exists in params
        transformed_params = params.copy()
        if 'action' in transformed_params:
            transformed_params['action'] = self.transform_action(transformed_params['action'])
            
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