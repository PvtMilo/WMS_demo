from flask import Blueprint, request, jsonify, Response
from routes_auth import auth_required
from db import get_conn, now_iso
import qrcode, io, re

bp = Blueprint("items", __name__, url_prefix="/items")

def _sanitize_code(text: str) -> str:
    t = (text or "").upper().strip()
    t = re.sub(r"\s+", "-", t)
    t = re.sub(r"[^A-Z0-9\-]", "", t)
    return t

def _next_number_for(prefix: str, model: str, conn) -> int:
    base = f"{_sanitize_code(prefix)}-{_sanitize_code(model)}-"
    cur = conn.cursor()
    cur.execute("SELECT id_code FROM item_unit WHERE id_code LIKE ? || '%'", (base,))
    max_n = 0
    for row in cur.fetchall():
        code = row["id_code"]
        if "-" in code:
            tail = code.rsplit("-", 1)[-1]
            if tail.isdigit():
                max_n = max(max_n, int(tail))
    return max_n + 1

@bp.post("/batch_create")
@auth_required
def batch_create():
    body = request.get_json(silent=True) or {}
    prefix = body.get("prefix") or ""
    name = body.get("name") or ""
    category = body.get("category") or ""
    model = body.get("model") or ""
    rack = body.get("rack") or ""
    qty = int(body.get("qty") or 0)
    if not all([prefix, name, category, model, rack]) or qty < 1 or qty > 500:
        return jsonify({"error": True, "message": "Data tidak lengkap atau qty tidak valid (1-500)"}), 400

    conn = get_conn()
    try:
        cur = conn.cursor()
        start_n = _next_number_for(prefix, model, conn)
        codes = []
        for i in range(qty):
            n = start_n + i
            id_code = f"{_sanitize_code(prefix)}-{_sanitize_code(model)}-{n:03d}"
            cur.execute("SELECT 1 FROM item_unit WHERE id_code=?", (id_code,))
            if cur.fetchone():
                return jsonify({"error": True, "message": f"Duplikat ID {id_code}, batalkan."}), 409
            cur.execute("""
              INSERT INTO item_unit (id_code, name, category, model, rack, status, defect_level, serial, created_at)
              VALUES (?, ?, ?, ?, ?, 'Good', 'none', NULL, ?)
            """, (id_code, name, category, _sanitize_code(model), rack, now_iso()))
            codes.append(id_code)
        conn.commit()
        return jsonify({"ok": True, "created": codes}), 201
    finally:
        conn.close()

@bp.get("")
@auth_required
def list_items():
    q = (request.args.get("q") or "").strip().upper()
    status = (request.args.get("status") or "").strip()
    category = (request.args.get("category") or "").strip().upper()

    sql = "SELECT id_code, name, category, model, rack, status, defect_level, serial, created_at FROM item_unit"
    filters, args = [], []

    if q:
        filters.append("(UPPER(id_code) LIKE ? OR UPPER(name) LIKE ? OR UPPER(model) LIKE ?)")
        like = f"%{q}%"
        args += [like, like, like]
    if status:
        filters.append("status = ?")
        args.append(status)
    if category:
        filters.append("UPPER(category) = ?")
        args.append(category)

    if filters:
        sql += " WHERE " + " AND ".join(filters)
    sql += " ORDER BY created_at DESC"

    conn = get_conn()
    try:
        rows = conn.execute(sql, args).fetchall()
        return jsonify({"data": [dict(r) for r in rows], "count": len(rows)})
    finally:
        conn.close()

@bp.get("/<id_code>")
@auth_required
def get_item(id_code):
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak ditemukan"}), 404
        return jsonify(dict(row))
    finally:
        conn.close()

@bp.put("/<id_code>")
@auth_required
def update_item(id_code):
    body = request.get_json(silent=True) or {}
    fields = {k: body.get(k) for k in ["name", "category", "model", "rack", "status", "defect_level", "serial"]}
    set_parts, args = [], []
    for k, v in fields.items():
        if v is not None:
            set_parts.append(f"{k}=?")
            args.append(v)
    if not set_parts:
        return jsonify({"error": True, "message": "Tidak ada perubahan"}), 400
    args.append(id_code)

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE item_unit SET " + ", ".join(set_parts) + " WHERE id_code=?", args)
        if cur.rowcount == 0:
            return jsonify({"error": True, "message": "Item tidak ditemukan"}), 404
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

@bp.get("/<id_code>/qr")
@auth_required
def qr_image(id_code):
    img = qrcode.make(id_code)  # payload cukup id_code
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(buf.getvalue(), mimetype="image/png")

@bp.delete("/<id_code>")
@auth_required
def delete_item(id_code):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM item_unit WHERE id_code=?", (id_code,))
        if cur.rowcount == 0:
            return jsonify({"error": True, "message": "Item tidak ditemukan"}), 404
        conn.commit()
        return jsonify({"ok": True}), 200
    finally:
        conn.close()