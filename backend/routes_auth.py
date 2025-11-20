from flask import Blueprint, request, jsonify
from functools import wraps
import uuid
import config  # file config.py di folder backend
from db import get_conn, now_iso

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

def require_roles(*roles):
    allowed = set([str(r).lower() for r in roles])
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(request, 'user', None)
            role = str((user or {}).get('role') or '').lower()
            if not role or (allowed and role not in allowed):
                return jsonify({"error": True, "message": "Forbidden: role tidak diizinkan"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco

@bp.post("/login")
def login():
    """Login plaintext → token UUID."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ? AND password = ?", (email, password)).fetchone()
    conn.close()

    if not row:
        return jsonify({"error": True, "message": "Email/password salah"}), 401

    user = {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
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

# ==== User Management (Admin Only) ====

@bp.get("/users")
@auth_required
@require_roles("admin")
def list_users():
    conn = get_conn()
    rows = conn.execute("SELECT id, email, name, role, created_at FROM users ORDER BY name").fetchall()
    conn.close()
    users = [dict(r) for r in rows]
    return jsonify({"users": users}), 200

@bp.post("/users")
@auth_required
@require_roles("admin")
def create_user():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    name = (data.get("name") or "").strip()
    role = (data.get("role") or "operator").strip().lower()

    if not email or not password or not name:
        return jsonify({"error": True, "message": "Email, password, name wajib"}), 400

    conn = get_conn()
    try:
        # Check duplicate email
        exist = conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
        if exist:
            return jsonify({"error": True, "message": "Email sudah digunakan"}), 400
        
        new_id = str(uuid.uuid4())
        conn.execute("""
            INSERT INTO users (id, email, password, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (new_id, email, password, name, role, now_iso()))
        conn.commit()
        return jsonify({"ok": True, "id": new_id}), 201
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        conn.close()

@bp.delete("/users/<user_id>")
@auth_required
@require_roles("admin")
def delete_user(user_id):
    # Prevent deleting self
    current_user = getattr(request, "user", {})
    if current_user.get("id") == user_id:
        return jsonify({"error": True, "message": "Tidak bisa menghapus akun sendiri"}), 400

    conn = get_conn()
    try:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return jsonify({"ok": True}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        conn.close()
