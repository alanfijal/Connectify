from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from models.user import User
from werkzeug.utils import secure_filename
from azure.storage.blob import BlobServiceClient
import uuid
from flask import current_app

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        print("Form data received:", request.form)
        print("Files received:", request.files)
        
        try:
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            is_neurotypical = request.form.get('is_neurotypical') == 'yes'
            neurodivergences = request.form.getlist('divergence[]') if not is_neurotypical else None
            age = int(request.form.get('age'))
            bio = request.form.get('bio')
            interests = [i.strip() for i in request.form.get('interests').split(',')]

            if not all([username, email, password, age, bio, interests]):
                flash('All fields are required', 'error')
                return redirect(url_for('auth.signup'))
            
            if User.find_by_username(username) or User.find_by_email(email):
                flash('Username or email already exists', 'error')
                return redirect(url_for('auth.signup'))
            
            if 'profile_image' not in request.files:
                flash('No image file provided', 'error')
                return redirect(url_for('auth.signup'))
                
            image_file = request.files['profile_image']
            if image_file.filename == '':
                flash('No selected file', 'error')
                return redirect(url_for('auth.signup'))
                
            try:
                file_extension = image_file.filename.rsplit('.', 1)[1].lower()
                blob_name = f"profile_images/{str(uuid.uuid4())}.{file_extension}"
                
                blob_service_client = BlobServiceClient.from_connection_string(
                    current_app.config['AZURE_STORAGE_CONNECTION_STRING']
                )
                container_client = blob_service_client.get_container_client(
                    current_app.config['AZURE_CONTAINER_NAME']
                )
                
                blob_client = container_client.get_blob_client(blob_name)
                image_file.seek(0)
                blob_client.upload_blob(image_file)
                
                image_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{current_app.config['AZURE_CONTAINER_NAME']}/{blob_name}"
                
                user = User.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_neurotypical=is_neurotypical,
                    neurodivergences=neurodivergences,
                    age=age,
                    bio=bio,
                    interests=interests,
                    profile_image_url=image_url
                )
                
                print("User created:", user.__dict__)
                
                if user:
                    flash('Account created successfully! Please log in.', 'success')
                    return redirect(url_for('auth.login'))
                else:
                    flash('Failed to create user', 'error')
                    return redirect(url_for('auth.signup'))
                
            except Exception as e:
                print(f"Error during signup: {str(e)}")
                flash(f'An error occurred: {str(e)}', 'error')
                return redirect(url_for('auth.signup'))
                
        except Exception as e:
            print(f"Error processing form data: {str(e)}")
            flash('Error processing form data', 'error')
            return redirect(url_for('auth.signup'))

    return render_template('signup.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        flash('You are already logged in!', 'info')
        return redirect(url_for('home'))
    
    if request.method == 'POST':
        
        username = request.form['username']
        password = request.form['password']

        user = User.find_by_username(username)
        if not user:
            flash('Invalid username or password', 'error')
            return redirect(url_for('auth.login'))
        if user and user.check_password(password):
            login_user(user, remember=True)
            session.permanent = True
            
            next_page = request.args.get('next')
            flash('Logged in successfully!', 'success')
            return redirect(next_page or url_for('home'))
        else:
            flash('Invalid username or password.', 'error')
            return redirect(url_for('auth.login'))

    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('auth.login'))