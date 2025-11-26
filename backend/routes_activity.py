from flask import Blueprint, request, jsonify
from db import get_conn
from routes_auth import auth_required, require_roles

bp = Blueprint("activity", __name__, url_prefix="/activity")

@bp.get("/logs")
@auth_required
@require_roles("admin")
def get_logs():
    username_filter = request.args.get("username", "").strip()
    
    conn = get_conn()
    query = "SELECT * FROM activity_logs"
    params = []
    
    if username_filter:
        query += " WHERE username LIKE ?"
        params.append(f"%{username_filter}%")
        
    query += " ORDER BY timestamp DESC LIMIT 100"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    logs = [dict(r) for r in rows]
    return jsonify({"logs": logs}), 200
