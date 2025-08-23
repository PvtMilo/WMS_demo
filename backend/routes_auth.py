from flask import Blueprint, request, jsonify
from functools import wraps
import uuid
import config  # file config.py di folder backend

bp = Blueprint("auth", __name__, url_prefix="/auth")

# token sederhana disimpan di memori (hilang saat server restart)
TOKENS: dict[str, dict] = {}  # token -> user dict

def auth_required(fn):
    """Cek header Authorization: Token <token>"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Token "):
            return jsonify({"error": True, "message": "Header Authorization: Token <token> wajib"}), 401
        token = auth.split(" ", 1)[1].strip()
        user = TOKENS.get(token)
        if not user:
            return jsonify({"error": True, "message": "Token tidak valid / kadaluarsa"}), 401
        request.user = user
        request.token = token
        return fn(*args, **kwargs)
    return wrapper

@bp.post("/login")
def login():
    """Login plaintext → token UUID."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if email != config.ADMIN_EMAIL:
        return jsonify({"error": True, "message": "Email tidak dikenal"}), 401
    if password != config.ADMIN_PASSWORD:
        return jsonify({"error": True, "message": "Password salah"}), 401

    user = {
        "id": config.ADMIN_ID,
        "email": config.ADMIN_EMAIL,
        "name": config.ADMIN_NAME,
        "role": config.ADMIN_ROLE,
    }
    token = uuid.uuid4().hex
    TOKENS[token] = user
    return jsonify({"token": token, "user": user}), 200

@bp.get("/me")
@auth_required
def me():
    return jsonify({"user": getattr(request, "user", None)}), 200

@bp.post("/logout")
@auth_required
def logout():
    TOKENS.pop(getattr(request, "token", ""), None)
    return jsonify({"ok": True}), 200