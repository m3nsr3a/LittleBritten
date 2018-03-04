from flask import (Flask, send_from_directory, make_response, render_template)

app = Flask(__name__, template_folder='',static_url_path='', static_folder='')

@app.route('/')
def index():
    response = make_response(render_template('static/html/index.html'))
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)