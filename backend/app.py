from flask import Flask, jsonify
from flask_cors import CORS
import config
from routes_auth import bp as auth_bp
from routes_items import bp as items_bp
from db import init_db

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": [config.FRONTEND_ORIGIN]}}, supports_credentials=True)

    @app.get("/")
    def health():
        return jsonify({"ok": True, "service": "WMS Home Server"}), 200

    init_db()
    app.register_blueprint(auth_bp)
    app.register_blueprint(items_bp)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host=config.HOST, port=config.PORT, debug=True)