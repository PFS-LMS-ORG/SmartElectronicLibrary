# app.py
from app import create_app
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = create_app()

if __name__ == '__main__':
    # Run the Flask app on port 5050
    app.run(host='0.0.0.0', port=5050, debug=True)