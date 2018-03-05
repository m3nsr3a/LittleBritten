from flask import (Flask, send_from_directory, make_response, render_template)

app = Flask(__name__, template_folder='',static_url_path='', static_folder='')

@app.route('/')
def index_alias():
    response = make_response(render_template('index.html', foo=42))
    return response
    # return send_from_directory('assets/web', 'index.html')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080)