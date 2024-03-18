from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/<sessionId>')
def game(sessionId):
    return render_template('game.html', sessionId=sessionId)

if __name__ == '__main__':
    app.run(app, debug=True)
