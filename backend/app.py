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



if __name__ == '__main__':
    app.run(debug=True)


