from flask import Blueprint, jsonify
from bson import ObjectId
from flask import current_app

article_bp = Blueprint('article', __name__)

@article_bp.route('/articles', methods=['GET'])
def get_articles():
    try:
        articles = current_app.mongo.db.articles.find()
        articles_list = []
        for article in articles:
            articles_list.append({
                'id': str(article['_id']),
                'article_id': article['article_id'],
                'title': article['title'],
                'excerpt': article['excerpt'],
                'tags': article['tags'],
                'published_date': article['published_date'],
                'author': article['author']
            })

        return jsonify(articles_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 

@article_bp.route('/article/<article_id>', methods=['GET'])
def get_article(article_id):
    try:
        article = current_app.mongo.db.articles.find_one({'_id': ObjectId(article_id)})
        if not article:
            return jsonify({'error': 'Article not Found'}), 404
        
        article_data = {
            '_id': str(article['_id']),
            'article_id': article['article_id'],
            'title': article['title'],
            'excerpt': article['excerpt'],
            'tags': article['tags'],
            'published_date': article['published_date'],
            'author': article['author']
            
        }

        return jsonify(article_data)

    except Exception as e:
        return jsonify({'error': str(e)})
        
