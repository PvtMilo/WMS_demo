# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import config
from routes_auth import bp as auth_bp
from routes_items import bp as items_bp
from routes_containers import bp as containers_bp   # NEW
from routes_emoney import bp as emoney_bp           # NEW
from db import init_db

def create_app():
    app = Flask(__name__)
    CORS(
        app,
        resources={r"/*": {"origins": [config.FRONTEND_ORIGIN]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.get("/")
    def health():
        return jsonify({"ok": True, "service": "WMS Home Server"}), 200

    init_db()
    app.register_blueprint(auth_bp)
    app.register_blueprint(items_bp)
    app.register_blueprint(containers_bp)            # NEW
    app.register_blueprint(emoney_bp)               # NEW
    try:
        from routes_admin_cleanup import bp as admin_cleanup_bp
        app.register_blueprint(admin_cleanup_bp)
    except Exception as e:
        # In dev, allow app to start even if admin routes missing
        print("[WARN] admin cleanup routes not loaded:", e)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host=config.HOST, port=config.PORT, debug=True)
