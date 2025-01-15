from flask import Flask, render_template
from dotenv import load_dotenv
import os
from flask_pymongo import PyMongo
from flask_login import LoginManager

load_dotenv()

mongo = PyMongo()

login_manager = LoginManager() 

def create_app():
    app = Flask(__name__,
                template_folder='../frontend/templates',
                static_folder='../frontend/static')

    app.config['MONGO_URI'] = os.getenv('MONGO_URI')
    if not app.config['MONGO_URI']:
        raise ValueError("MONGO_URI not found in environment variables")
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

   
    mongo.init_app(app)
    login_manager.init_app(app)

  
    from api.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api')


    return app

app = create_app()

@login_manager.user_loader
def load_user(user_id):
    return mongo.db.users.find_one({'_id': user_id})

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
        return render_template('login.html')

@app.route('/swipe')
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

@app.route('/signup', methods=['GET'])
def signup():
    return render_template('signup.html')

if __name__ == '__main__':
    app.run(debug=True)


