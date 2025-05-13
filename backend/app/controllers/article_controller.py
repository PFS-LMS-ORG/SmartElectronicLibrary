from flask import Blueprint, Response, abort, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from app.db import db
from app.model.ArticleView import ArticleView
from app.model.ArticleLike import ArticleLike
from app.model.ArticleBookmark import ArticleBookmark
from app.model.ArticleAuthor import ArticleAuthor
from app.model.Article import Article
from app.model.ArticleMeta import ArticleMeta
from app.model.Article import Article

from math import ceil
from datetime import datetime
from slugify import slugify
import logging


# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

article_controller = Blueprint('article_controller', __name__)

@article_controller.route('/articles', methods=['GET'])
@jwt_required()
def get_articles():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search = request.args.get('search', '').lower()
    category = request.args.get('category', '').lower()
    tag = request.args.get('tag', '').lower()

    query = Article.query.join(ArticleAuthor)

    # Search filter (by title, author name, or summary)
    if search:
        query = query.filter(
            db.or_(
                Article.title.ilike(f'%{search}%'),
                ArticleAuthor.name.ilike(f'%{search}%'),
                Article.summary.ilike(f'%{search}%'),
            )
        )

    # Category filter
    if category:
        query = query.filter(Article.category.ilike(f'%{category}%'))

    # Tag filter
    if tag:
        query = query.filter(Article.tags.like(f'%"{tag}"%'))

    # Pagination
    total_count = query.count()
    articles = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'articles': [article.to_dict() for article in articles],
        'total_count': total_count,
        'total_pages': ceil(total_count / per_page)
    }), 200

@article_controller.route('/articles/<string:slug>', methods=['GET'])
@jwt_required()
def get_article_by_slug(slug):
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "Unauthorized access"}), 401
    
    # Fetch the article by slug
    article = Article.query.filter_by(slug=slug).first()
    if article:
        # Check if the user has already viewed this article
        existing_view = ArticleView.query.filter_by(user_id=user_id, article_meta_id=article.meta.id).first()
        if not existing_view:
            # Record the view and increment the views count
            view = ArticleView(user_id=user_id, article_meta_id=article.meta.id)
            article.meta.views += 1
            db.session.add(view)
            db.session.commit()
            
        return jsonify(article.to_dict()), 200
    
    
    return jsonify({"error": "Article not found"}), 404

@article_controller.route('/articles', methods=['POST'])
@jwt_required()
def create_article():
    data = request.get_json()
    if not data or not all(key in data for key in ["title", "pdf_url", "category", "author", "summary"]):
        return jsonify({"error": "Missing required fields"}), 400

    # Handle author
    author_data = data["author"]
    author = ArticleAuthor.query.filter_by(name=author_data["name"]).first()
    if not author:
        author = ArticleAuthor(name=author_data["name"], avatar_url=author_data.get("avatarUrl"))
        db.session.add(author)
        db.session.flush()

    # Create article
    article = Article(
        title=data["title"],
        slug=slugify(data["title"]),  # Using slugify for better slug generation
        cover_image_url=data.get("coverImageUrl", "https://placehold.co/600x300"),
        category=data["category"],
        author_id=author.id,
        summary=data["summary"],
        pdf_url=data["pdf_url"],  # Changed from content to pdf_url
        tags=data.get("tags", []),
        created_at=datetime.utcnow()
    )
    db.session.add(article)
    db.session.flush()

    # Create meta
    meta = ArticleMeta(
        article_id=article.id,
        read_time=data.get("meta", {}).get("readTime", 5),
        views=data.get("meta", {}).get("views", 0),
        likes_count=data.get("meta", {}).get("likes", 0),
        bookmarks_count=data.get("meta", {}).get("bookmarks", 0)
    )
    db.session.add(meta)
    db.session.commit()

    return jsonify(article.to_dict()), 201

@article_controller.route('/articles/<string:slug>', methods=['PUT'])
@jwt_required()
def update_article(slug):
    article = Article.query.filter_by(slug=slug).first()
    if not article:
        return jsonify({"error": "Article not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Update fields
    for key in ["title", "pdf_url", "category", "summary", "tags", "cover_image_url"]:
        if key in data:
            setattr(article, key, data[key])

    if "author" in data:
        author_data = data["author"]
        author = ArticleAuthor.query.filter_by(name=author_data["name"]).first()
        if not author:
            author = ArticleAuthor(name=author_data["name"], avatar_url=author_data.get("avatarUrl"))
            db.session.add(author)
            db.session.flush()
        article.author_id = author.id

    if "meta" in data:
        article.meta.read_time = data["meta"].get("readTime", article.meta.read_time)
        article.meta.views = data["meta"].get("views", article.meta.views)
        article.meta.likes_count = data["meta"].get("likes", article.meta.likes_count)
        article.meta.bookmarks_count = data["meta"].get("bookmarks", article.meta.bookmarks_count)

    if "title" in data:
        article.slug = slugify(data["title"])

    article.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(article.to_dict()), 200

@article_controller.route('/articles/<string:slug>', methods=['DELETE'])
@jwt_required()
def delete_article(slug):
    article = Article.query.filter_by(slug=slug).first()
    if not article:
        return jsonify({"error": "Article not found"}), 404

    db.session.delete(article)
    db.session.commit()
    return jsonify({"message": "Article deleted successfully"}), 200

@article_controller.route('/articles/related/<string:id>', methods=['GET'])
@jwt_required()
def get_related_articles(id):
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"error": "Unauthorized access"}), 401

    article = Article.query.get_or_404(id)
    limit = int(request.args.get('limit', 3))
    tags = request.args.get('tags', '').split(',') if request.args.get('tags') else []
    tags = [tag.strip() for tag in tags if tag.strip()]
    category = request.args.get('category', '')

    # Find related articles
    related_articles = []
    scored_articles = []

    for other_article in Article.query.filter(Article.id != id).all():
        # Calculate relevance score based on tag matches
        common_tags = set(tags) & set(other_article.tags)
        score = len(common_tags)
        # Boost score if category matches
        if category and other_article.category.lower() == category.lower():
            score += 1
        if score > 0 or (category and other_article.category.lower() == category.lower()) or common_tags:
            scored_articles.append((score, other_article))

    # Sort by score (descending) and limit results
    scored_articles.sort(key=lambda x: x[0], reverse=True)
    for _, other_article in scored_articles[:limit]:
        related_articles.append({
            "id": str(other_article.id),
            "title": other_article.title,
            "slug": other_article.slug,
            "coverImageUrl": other_article.cover_image_url,
            "category": other_article.category,
            "summary": other_article.summary,
            "createdAt": other_article.created_at.isoformat() + 'Z'
        })

    return jsonify({"relatedArticles": related_articles}), 200

@article_controller.route('/articles/<int:id>/like', methods=['POST'])
@jwt_required()
def like_article(id):
    user_id = get_jwt_identity()
    article = Article.query.get_or_404(id)

    # Check if already liked
    existing_like = ArticleLike.query.filter_by(user_id=user_id, article_id=id).first()
    if existing_like:
        db.session.delete(existing_like)
        article.meta.likes_count = max(0, article.meta.likes_count - 1)
        db.session.commit()
        return jsonify({'message': 'Article unliked', 'likes': article.meta.likes_count}), 200

    # Add like
    like = ArticleLike(user_id=user_id, article_id=id)
    article.meta.likes_count += 1
    db.session.add(like)
    db.session.commit()
    return jsonify({'message': 'Article liked', 'likes': article.meta.likes_count}), 200

@article_controller.route('/articles/<int:id>/bookmark', methods=['POST'])
@jwt_required()
def bookmark_article(id):
    user_id = get_jwt_identity()
    article = Article.query.get_or_404(id)

    # Check if already bookmarked
    existing_bookmark = ArticleBookmark.query.filter_by(user_id=user_id, article_id=id).first()
    if existing_bookmark:
        db.session.delete(existing_bookmark)
        article.meta.bookmarks_count = max(0, article.meta.bookmarks_count - 1)
        db.session.commit()
        return jsonify({'message': 'Article unbookmarked', 'bookmarks': article.meta.bookmarks_count}), 200

    # Add bookmark
    bookmark = ArticleBookmark(user_id=user_id, article_id=id)
    article.meta.bookmarks_count += 1
    db.session.add(bookmark)
    db.session.commit()
    return jsonify({'message': 'Article bookmarked', 'bookmarks': article.meta.bookmarks_count}), 200

@article_controller.route('/user/likes', methods=['GET'])
@jwt_required()
def get_user_likes():
    user_id = get_jwt_identity()
    likes = ArticleLike.query.filter_by(user_id=user_id).all()
    liked_article_ids = [str(like.article_id) for like in likes]
    return jsonify({'likedArticleIds': liked_article_ids}), 200

@article_controller.route('/user/bookmarks', methods=['GET'])
@jwt_required()
def get_user_bookmarks():
    user_id = get_jwt_identity()
    bookmarks = ArticleBookmark.query.filter_by(user_id=user_id).all()
    bookmarked_article_ids = [str(bookmark.article_id) for bookmark in bookmarks]
    return jsonify({'bookmarkedArticleIds': bookmarked_article_ids}), 200


# Proxy endpoint to fetch PDFs from external URLs
@article_controller.route('/proxy-pdf', methods=['GET'])
def proxy_pdf():
    pdf_url = request.args.get('url')
    logger.debug(f"Received request for PDF URL: {pdf_url}")
    if not pdf_url:
        logger.error("PDF URL is missing")
        abort(400, description="PDF URL is required")

    try:
        logger.debug(f"Fetching PDF from {pdf_url}")
        response = requests.get(pdf_url, stream=True)
        response.raise_for_status()
        logger.debug(f"PDF fetched successfully, status code: {response.status_code}")

        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                yield chunk

        return Response(generate(), content_type='application/pdf')
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch PDF: {str(e)}")
        abort(500, description=f"Failed to fetch PDF: {str(e)}")