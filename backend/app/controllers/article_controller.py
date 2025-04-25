
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.db import db
from app.model import Article, ArticleAuthor, ArticleMeta, ArticleLike, ArticleBookmark
from math import ceil
from datetime import datetime

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

    if search:
        query = query.filter(
            db.or_(
                Article.title.ilike(f'%{search}%'),
                ArticleAuthor.name.ilike(f'%{search}%'),
            )
        )

    if category:
        query = query.filter(Article.category.ilike(f'%{category}%'))

    if tag:
        query = query.filter(Article.tags.like(f'%"{tag}"%'))

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
    article = Article.query.filter_by(slug=slug).first()
    if article:
        return jsonify(article.to_dict()), 200
    return jsonify({"error": "Article not found"}), 404

@article_controller.route('/articles', methods=['POST'])
@jwt_required()
def create_article():
    data = request.get_json()
    if not data or not all(key in data for key in ["title", "pdfUrl", "category", "author", "summary"]):
        return jsonify({"error": "Missing required fields"}), 400

    author_data = data["author"]
    author = ArticleAuthor.query.filter_by(name=author_data["name"]).first()
    if not author:
        author = ArticleAuthor(name=author_data["name"], avatar_url=author_data.get("avatarUrl"))
        db.session.add(author)
        db.session.flush()

    article = Article(
        title=data["title"],
        slug=data["title"].lower().replace(" ", "-").replace("'", "").replace(",", ""),
        cover_image_url=data.get("coverImageUrl", "https://placehold.co/600x300"),
        category=data["category"],
        author_id=author.id,
        summary=data["summary"],
        pdf_url=data["pdfUrl"],  # Replaced content with pdfUrl
        tags=data.get("tags", []),
        created_at=datetime.utcnow()
    )
    db.session.add(article)
    db.session.flush()

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

    for key in ["title", "pdfUrl", "category", "summary", "tags", "cover_image_url"]:
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
        article.slug = data["title"].lower().replace(" ", "-").replace("'", "").replace(",", "")

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

    related_articles = []
    scored_articles = []

    for other_article in Article.query.filter(Article.id != id).all():
        common_tags = set(tags) & set(other_article.tags)
        score = len(common_tags)
        if category and other_article.category.lower() == category.lower():
            score += 1
        if score > 0 or (category and other_article.category.lower() == category.lower()) or common_tags:
            scored_articles.append((score, other_article))

    scored_articles.sort(key=lambda x: x[0], reverse=True)
    for _, other_article in scored_articles[:limit]:
        related_articles.append({
            "id": str(other_article.id),
            "title": other_article.title,
            "slug": other_article.slug,
            "coverImageUrl": other_article.cover_image_url,
            "category": other_article.category,
            "summary": other_article.summary,
            "pdfUrl": other_article.pdf_url,  # Added pdfUrl
            "createdAt": other_article.created_at.isoformat() + 'Z'
        })

    return jsonify({"relatedArticles": related_articles}), 200

@article_controller.route('/articles/<int:id>/like', methods=['POST'])
@jwt_required()
def like_article(id):
    user_id = get_jwt_identity()
    article = Article.query.get_or_404(id)

    existing_like = ArticleLike.query.filter_by(user_id=user_id, article_id=id).first()
    if existing_like:
        db.session.delete(existing_like)
        article.meta.likes_count = max(0, article.meta.likes_count - 1)
        db.session.commit()
        return jsonify({'message': 'Article unliked', 'likes': article.meta.likes_count}), 200

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

    existing_bookmark = ArticleBookmark.query.filter_by(user_id=user_id, article_id=id).first()
    if existing_bookmark:
        db.session.delete(existing_bookmark)
        article.meta.bookmarks_count = max(0, article.meta.bookmarks_count - 1)
        db.session.commit()
        return jsonify({'message': 'Article unbookmarked', 'bookmarks': article.meta.bookmarks_count}), 200

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