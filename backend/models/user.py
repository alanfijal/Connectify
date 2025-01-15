from flask_login import UserMixin
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

bcrypt = Bcrypt()
mongo = MongoClient(os.getenv('MONGO_URI'))
database = mongo[os.getenv('DATABASE_NAME')]
collection = database[os.getenv('COLLECTION_NAME')]

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data['_id'])
        self.username = user_data['username']
        self.email = user_data['email']
        self.password = user_data['password']
        self.is_neurotypical = user_data['is_neurotypical']
        self.neurodivergences = user_data['neurodivergences']
        self.age = user_data['age']
        self.bio = user_data['bio']
        self.interests = user_data['interests']

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    @staticmethod
    def find_by_username(username):
        user_data = mongo.db.users.find_one({'username': username})
        if user_data:
            return User(user_data)
        return None

    @staticmethod
    def find_by_email(email):
        user_data = mongo.db.users.find_one({'email': email})
        if user_data:
            return User(user_data)
        return None

    @staticmethod
    def create_user(username, email, password, is_neurotypical, neurodivergences, age, bio, interests):
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user_data = {
            'username': username,
            'email': email,
            'password': hashed_password,
            'is_neurotypical': is_neurotypical,
            'neurodivergences': neurodivergences,
            'age': age,
            'bio': bio,
            'interests': interests
        }
        mongo.db.users.insert_one(user_data)
        return User.find_by_username(username)