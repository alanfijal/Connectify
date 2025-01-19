from flask_login import UserMixin
from flask_bcrypt import Bcrypt
from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
from bson.errors import InvalidId

bcrypt = Bcrypt()

class User(UserMixin):
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def check_password(self, password):
        return check_password_hash(self.password, password)
    
    def get_id(self):
        return str(self._id)

    @staticmethod
    def find_by_username(username):
        user_data = current_app.mongo.db.users.find_one({'username': username})
        return User(**user_data) if user_data else None

    @staticmethod
    def find_by_email(email):
        user_data = current_app.mongo.db.users.find_one({'email': email})
        return User(**user_data) if user_data else None

    @staticmethod
    def find_by_id(user_id):
        try:
            object_id = ObjectId(user_id)
        except InvalidId:
            return None
        
        user_data = current_app.mongo.db.users.find_one({'_id': object_id})
        return User(**user_data) if user_data else None

    @staticmethod
    def create_user(**kwargs):
        if 'username' in kwargs:
            kwargs['user'] = kwargs['username']

        kwargs['password'] = generate_password_hash(kwargs['password'])
        
        result = current_app.mongo.db.users.insert_one(kwargs)
        kwargs['_id'] = result.inserted_id 
        return User(**kwargs)  