from flask import Flask, render_template

app = Flask(__name__, 
           template_folder='../frontend/templates',
           static_folder='../frontend/static')

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

if __name__ == '__main__':
    app.run(debug=True)

