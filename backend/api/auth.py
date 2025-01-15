from flask import Blueprint, render_template, redirect, url_for, flash, request 
from flask_login import login_user, logout_user, login_required
from models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        is_neurotypical = request.form.get('is_neurotypical') == 'yes'
        # Handle multiple selections for neurodivergences
        neurodivergences = request.form.getlist('divergence[]') if not is_neurotypical else None
        age = int(request.form.get('age'))
        bio = request.form.get('bio')
        interests = [i.strip() for i in request.form.get('interests').split(',')]

        # Validate if user exists
        if User.find_by_username(username) or User.find_by_email(email):
            flash('Username or email already exists', 'error')
            return redirect(url_for('signup'))
        
        try:
            User.create_user(
                username=username,
                email=email,
                password=password,
                is_neurotypical=is_neurotypical,
                neurodivergences=neurodivergences,
                age=age,
                bio=bio,
                interests=interests
            )
            flash('Account created successfully! Please log in.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            flash(f'An error occurred: {str(e)}', 'error')
            return redirect(url_for('signup'))
    
    return render_template('signup.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.find_by_username(username)
        if user and user.check_password(password):
            login_user(user)
            flash('Logged in successfully!', 'success')
            return redirect(url_for('home'))

        flash('Invalid username or password.', 'error')
        return redirect(url_for('auth.login'))

    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('auth.login'))