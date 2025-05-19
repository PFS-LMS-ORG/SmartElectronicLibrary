# backend/app/services/UserService.py

from app.model.User import User
from app.model.AccountRequest import AccountRequest
from app.model.Article import Article
from app.model.ArticleLike import ArticleLike
from app.model.ArticleBookmark import ArticleBookmark
from app.db import db
from datetime import datetime
from sqlalchemy import or_
import math

class UserService:
    @staticmethod
    def get_all_users():
        return User.query.all()
        
    @staticmethod
    def get_paginated_users(page=1, per_page=10, search='', role=None):
        """
        Get paginated users with optional filtering.
        
        Args:
            page (int): The page number (1-indexed)
            per_page (int): Number of items per page
            search (str): Search query for name or email
            role (str): Filter by user role
            
        Returns:
            tuple: (users, total_count, total_pages)
        """
        query = User.query
        
        # Apply search filter if present
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Apply role filter if present
        if role:
            query = query.filter(User.role == role)
        
        # Count total users matching the filters
        total_count = query.count()
        
        # Calculate total pages
        total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1
        
        # Ensure page is within valid range
        page = max(1, min(page, total_pages))
        
        # Get paginated results
        offset = (page - 1) * per_page
        users = query.order_by(User.id).offset(offset).limit(per_page).all()
        
        return users, total_count, total_pages

    @staticmethod
    def get_user_by_id(user_id):
        return User.query.get(user_id)

    @staticmethod
    def get_user_by_email(email):
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create_user(name, email, role='user'):
        new_user = User(name=name, email=email, role=role)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def update_user(user_id, name=None, email=None, role=None):
        user = User.query.get(user_id)
        if not user:
            return None
        if name:
            user.name = name
        if email:
            user.email = email
        if role:
            user.role = role
        db.session.commit()
        return user

    @staticmethod
    def delete_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return False
        
        # Add safety check to prevent deleting admin users
        if user.role == 'admin':
            return False
            
        db.session.delete(user)
        db.session.commit()
        return True

    @staticmethod
    def create_account_request(name, email, password_hash):
        """Create a new account request for a user awaiting admin approval."""
        if User.query.filter_by(email=email).first() or AccountRequest.query.filter_by(email=email).first():
            return None
        request = AccountRequest(
            name=name,
            email=email,
            password_hash=password_hash,  # Store the hashed password
            status='pending',
            created_at=datetime.utcnow()
        )
        db.session.add(request)
        db.session.commit()
        return request

    @staticmethod
    def get_account_requests():
        """Retrieve all account requests."""
        return AccountRequest.query.all()
    
    @staticmethod
    def get_paginated_account_requests(page=1, per_page=10, status='all', search=''):
        """
        Get paginated account requests with optional filtering.
        
        Args:
            page (int): The page number (1-indexed)
            per_page (int): Number of items per page
            status (str): Filter by status ('all', 'pending', 'approved', 'rejected')
            search (str): Search query for name or email
            
        Returns:
            tuple: (account_requests, total_count, total_pages)
        """
        query = AccountRequest.query
        
        # Apply status filter if present
        if status and status != 'all':
            query = query.filter(AccountRequest.status == status)
        
        # Apply search filter if present
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    AccountRequest.name.ilike(search_term),
                    AccountRequest.email.ilike(search_term),
                    AccountRequest.id.in_([int(search) if search.isdigit() else 0])
                )
            )
        
        # Count total account requests matching the filters
        total_count = query.count()
        
        # Calculate total pages
        total_pages = math.ceil(total_count / per_page) if total_count > 0 else 1
        
        # Ensure page is within valid range
        page = max(1, min(page, total_pages))
        
        # Get paginated results
        offset = (page - 1) * per_page
        account_requests = query.order_by(AccountRequest.created_at.desc()).offset(offset).limit(per_page).all()
        
        return account_requests, total_count, total_pages


    @staticmethod
    def get_account_request_by_id(request_id):
        """Retrieve a specific account request by ID."""
        return AccountRequest.query.get(request_id)

    @staticmethod
    def approve_account_request(request_id):
        """Approve an account request and convert it to a user."""
        request = AccountRequest.query.get(request_id)
        if not request or request.status != 'pending':
            return None
        user = User(name=request.name, email=request.email, role='user')
        user.password_hash = request.password_hash  # Directly assign the stored hash
        db.session.add(user)
        db.session.delete(request)
        db.session.commit()
        return user

    @staticmethod
    def reject_account_request(request_id):
        """Reject an account request and delete it."""
        request = AccountRequest.query.get(request_id)
        if not request or request.status != 'pending':
            return False
        db.session.delete(request)
        db.session.commit()
        return True

    @staticmethod
    def set_account_request_pending(request_id):
        """Set an account request status to pending."""
        request = AccountRequest.query.get(request_id)
        if not request:
            return False
        request.status = 'pending'
        db.session.commit()
        return True


    @staticmethod
    def get_user_profile(user_id):
        """
        Get comprehensive user profile information including statistics and article interactions.
        
        Args:
            user_id (int): User ID
            
        Returns:
            dict: User profile information including stats and article interactions
        """
        
        user = User.query.get(user_id)
        if not user:
            return None
        
        # Calculate days active
        days_active = (datetime.utcnow() - user.date_joined).days
        
        # Get liked articles
        liked_articles = db.session.query(Article).join(
            ArticleLike, Article.id == ArticleLike.article_id
        ).filter(ArticleLike.user_id == user_id).all()
        
        # Get bookmarked articles
        bookmarked_articles = db.session.query(Article).join(
            ArticleBookmark, Article.id == ArticleBookmark.article_id
        ).filter(ArticleBookmark.user_id == user_id).all()
        
        # Determine favorite category based on rental history
        favorite_category = None
        if user.rentals:
            # Get all categories from user's rentals
            category_counts = {}
            for rental in user.rentals:
                for category in rental.book.categories:
                    if category.name in category_counts:
                        category_counts[category.name] += 1
                    else:
                        category_counts[category.name] = 1
            
            # Find the most frequent category
            if category_counts:
                favorite_category = max(category_counts.items(), key=lambda x: x[1])[0]
        
        return {
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'date_joined': user.date_joined.isoformat(),
            },
            'stats': {
                'days_active': days_active,
                'favorite_category': favorite_category,
                'books_read': len([r for r in user.rentals if r.returned_at is not None]),
                'currently_reading': len([r for r in user.rentals if r.returned_at is None]),
                'liked_articles_count': len(liked_articles),
                'bookmarked_articles_count': len(bookmarked_articles)
            },
            'liked_articles': [article.to_dict() for article in liked_articles[:5]],  # Limit to 5 for preview
            'bookmarked_articles': [article.to_dict() for article in bookmarked_articles[:5]]
        }


