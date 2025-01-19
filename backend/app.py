from flask import Flask, render_template, session
from dotenv import load_dotenv
import os
from flask_pymongo import PyMongo
from flask_login import LoginManager, login_required
from azure.storage.blob import BlobServiceClient
from datetime import timedelta
import uuid

load_dotenv()

mongo = PyMongo()
login_manager = LoginManager()

def create_app():

    app = Flask(__name__,
                template_folder='../frontend/templates',
                static_folder='../frontend/static')

    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['PERNAMENT_SESSION_LIFETIME'] = timedelta(days=7)
    app.config['MONGO_URI'] = os.getenv('MONGO_URI')
    app.config["MONGO_DBNAME"] = "userinfo"
    if not app.config['MONGO_URI']:
        raise ValueError("MONGO_URI not found in environment variables")
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    print("Loaded Secret_key:", app.config['SECRET_KEY'])
    app.config['AZURE_STORAGE_CONNECTION_STRING'] = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
    app.config['AZURE_CONTAINER_NAME'] = os.getenv('AZURE_CONTAINER_NAME')

    mongo.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)
    app.mongo = mongo
    
    with app.app_context():
        from api.auth import auth_bp
        from api.profile import profile_bp
        app.register_blueprint(auth_bp, url_prefix='/api')
        app.register_blueprint(profile_bp, url_prefix='/api')
    
    return app

app = create_app()

@login_manager.user_loader
def load_user(user_id):
    from models.user import User
    return User.find_by_id(user_id)


@app.route('/')
def home():
    try:
        return render_template('home.html')
    except Exception as e:
        print(f"Error loading user: {e}")
        return None 

@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html')



@app.route('/swipe')
@login_required
def swipe():
    user = {
        'name': 'John Pork',
        'image_url': '/static/images/John_pork.webp',
        'age': 25,
        'divergence': 'Autism',
        'bio': 'I am a software engineer and I love to code.',
        'interests': 'Reading, Writing, Coding'
    }
    return render_template('swipe.html', user=user)

@app.route('/test-db')
def test_db():
    try:
        collections = mongo.db.list_collection_names()
        return f"Connected! Collections: {collections}"
    except Exception as e:
        return f"Database connection error: {str(e)}"

@app.route('/test-blob')
def test_blob():
    try:
        connection_string = app.config['AZURE_STORAGE_CONNECTION_STRING']
        container_name = app.config['AZURE_CONTAINER_NAME']

        if not connection_string:
            return "AZURE_STORAGE_CONNECTION_STRING is not set", 400

        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        container_client = blob_service_client.get_container_client(container_name)

        blob_list = container_client.list_blobs()
        blob_names = [blob.name for blob in blob_list]

        return f"Connected to container: {container_name}. Blob found: {blob_names}"

    except Exception as e:
        return f"Error connecting to blob: {e}", 500


if __name__ == '__main__':
    app.run(debug=True)


