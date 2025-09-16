from flask import Blueprint, request, jsonify, Response
from routes_auth import auth_required, require_roles
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
    is_universal = 1 if (body.get("is_universal") in (True, 1, "1", "true", "TRUE", "True")) else 0
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
              INSERT INTO item_unit (id_code, name, category, model, rack, status, defect_level, serial, created_at, is_universal)
              VALUES (?, ?, ?, ?, ?, 'Good', 'none', NULL, ?, ?)
            """, (id_code, name, category, _sanitize_code(model), rack, now_iso(), is_universal))
            codes.append(id_code)
        conn.commit()
        return jsonify({"ok": True, "created": codes}), 201
    finally:
        conn.close()

# contoh list items (ringkas)
@bp.get("")
@auth_required
def list_items():
    """
    List items dengan paging & pencarian lintas kolom.
    Query param:
      - q: string (opsional), dipisah spasi jadi multi-term (AND)
      - page: int mulai 1 (default 1)
      - per_page: int (maks 100; default 100)
    Response:
    {
      "data": [ ... <= per_page ... ],
      "total": <int>,
      "page": <int>,
      "per_page": <int>
    }
    """
    q_raw = (request.args.get("q") or "").strip()
    page = int(request.args.get("page") or 1)
    per_page = int(request.args.get("per_page") or 100)
    if page < 1: page = 1
    if per_page < 1: per_page = 1
    if per_page > 100: per_page = 100

    tokens = [t.strip().upper() for t in q_raw.split() if t.strip()]

    conn = get_conn()
    try:
        where_sql = "WHERE 1=1"
        args = []

        # Untuk tiap token, buat grup OR across kolom; seluruh token digabung AND
        for tok in tokens:
            like = f"%{tok}%"
            where_sql += " AND (" + " OR ".join([
                "UPPER(id_code)  LIKE ?",
                "UPPER(name)     LIKE ?",
                "UPPER(category) LIKE ?",
                "UPPER(model)    LIKE ?",
                "UPPER(rack)     LIKE ?",
                "UPPER(status)   LIKE ?",
            ]) + ")"
            args += [like, like, like, like, like, like]

        # hitung total
        total = conn.execute(f"SELECT COUNT(*) FROM item_unit {where_sql}", args).fetchone()[0]

        # ambil page
        offset = (page - 1) * per_page
        rows = conn.execute(f"""
            SELECT id_code, name, category, model, rack, status, defect_level, created_at, is_universal
            FROM item_unit
            {where_sql}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, args + [per_page, offset]).fetchall()

        return jsonify({
            "data": [dict(r) for r in rows],
            "total": int(total),
            "page": page,
            "per_page": per_page
        })
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

@bp.put("/<id_code>")   # ✅ benar → /items/<id_code>
@auth_required
def update_item(id_code):
    id_code = (id_code or "").strip()
    b = request.get_json(silent=True) or {}

    conn = get_conn()
    try:
        row = conn.execute("SELECT status FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak ditemukan"}), 404

        if (row["status"] or "").lower() == "keluar":
            return jsonify({"error": True, "message": "Item sedang dibawa event (status Keluar) — tidak bisa diubah dari Inventory."}), 400

        name     = (b.get("name") or "").strip()
        category = (b.get("category") or "").strip()
        model    = (b.get("model") or "").strip()
        rack     = (b.get("rack") or "").strip()
        serial   = (b.get("serial") or "").strip()

        conn.execute("""
          UPDATE item_unit
          SET name=?, category=?, model=?, rack=?, serial=?
          WHERE id_code=?
        """, (name, category, model, rack, serial, id_code))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

@bp.get("/summary_by_category")
@auth_required
def summary_by_category():
    """
    Ringkasan jumlah per kategori (semua status).
    Sekaligus kirim breakdown status untuk kebutuhan ke depan.
    """
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT
              category,
              COUNT(*) AS total,
              SUM(CASE WHEN status='Good'   THEN 1 ELSE 0 END) AS good,
              SUM(CASE WHEN status='Keluar' THEN 1 ELSE 0 END) AS keluar,
              SUM(CASE WHEN status='Rusak'  THEN 1 ELSE 0 END) AS rusak,
              SUM(CASE WHEN status='Hilang' THEN 1 ELSE 0 END) AS hilang,
              SUM(CASE WHEN status='Afkir'  THEN 1 ELSE 0 END) AS afkir
            FROM item_unit
            GROUP BY category
            ORDER BY category ASC
        """).fetchall()
        data = [dict(r) for r in rows]
        return jsonify({"data": data})
    finally:
        conn.close()

@bp.get("/maintenance_list")
@auth_required
def maintenance_list():
    """
    Daftar item yang berstatus Rusak (ringan/berat), opsional filter q.
    Mengikutkan catatan kerusakan terakhir (damage_note) jika ada.
    """
    q_raw = (request.args.get("q") or "").strip()
    page = int(request.args.get("page") or 1)
    per_page = int(request.args.get("per_page") or 50)
    if page < 1: page = 1
    if per_page < 1: per_page = 1
    if per_page > 200: per_page = 200
    tokens = [t.strip().upper() for t in q_raw.split() if t.strip()]

    conn = get_conn()
    try:
        where_sql = "WHERE iu.status='Rusak'"
        args = []
        for tok in tokens:
            like = f"%{tok}%"
            where_sql += " AND (" + " OR ".join([
                "UPPER(iu.id_code)  LIKE ?",
                "UPPER(iu.name)     LIKE ?",
                "UPPER(iu.category) LIKE ?",
                "UPPER(iu.model)    LIKE ?",
                "UPPER(iu.rack)     LIKE ?",
                "UPPER(iu.defect_level) LIKE ?",
            ]) + ")"
            args += [like, like, like, like, like, like]

        base = f"""
            SELECT
              iu.id_code, iu.name, iu.category, iu.model, iu.rack,
              iu.status, iu.defect_level,
              (
                SELECT ci.damage_note FROM container_item ci
                WHERE ci.id_code = iu.id_code AND ci.damage_note IS NOT NULL
                ORDER BY ci.returned_at DESC, ci.id DESC
                LIMIT 1
              ) AS last_damage_note,
              (
                SELECT ci.returned_at FROM container_item ci
                WHERE ci.id_code = iu.id_code AND ci.returned_at IS NOT NULL
                ORDER BY ci.returned_at DESC, ci.id DESC
                LIMIT 1
              ) AS last_returned_at
            FROM item_unit iu
            {where_sql}
        """
        total = conn.execute(f"SELECT COUNT(*) c FROM ({base}) t", args).fetchone()["c"]
        offset = (page - 1) * per_page
        rows = conn.execute(
            f"{base} ORDER BY iu.category ASC, iu.name ASC, iu.model ASC LIMIT ? OFFSET ?",
            args + [per_page, offset]
        ).fetchall()
        # counts per defect level (global for current filter)
        cnt_rows = conn.execute(
            f"SELECT iu.defect_level d, COUNT(*) c FROM item_unit iu {where_sql} GROUP BY iu.defect_level",
            args,
        ).fetchall()
        counts = {"ringan": 0, "berat": 0}
        for r in cnt_rows:
            d = (r["d"] or "").strip().lower()
            if d in counts:
                counts[d] = int(r["c"] or 0)
        return jsonify({
            "data": [dict(r) for r in rows],
            "total": int(total),
            "page": page,
            "per_page": per_page,
            "counts": counts,
        })
    finally:
        conn.close()

@bp.post("/repair")
@auth_required
def repair_item():
    """
    Tandai item Rusak menjadi Good. Wajib kirim repair_note.
    Body: { id_code: string, note: string, target?: 'good'|'rusak_ringan'|'broken' }
    """
    b = request.get_json(silent=True) or {}
    id_code = (b.get("id_code") or "").strip()
    note = (b.get("note") or "").strip()
    target = (b.get("target") or "good").strip().lower()
    if not id_code:
        return jsonify({"error": True, "message": "id_code wajib"}), 400
    if not note:
        return jsonify({"error": True, "message": "Catatan penanganan (note) wajib diisi"}), 400

    conn = get_conn()
    try:
        row = conn.execute("SELECT status, defect_level FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak ditemukan"}), 404
        if row["status"] not in ("Rusak", "Afkir"):
            return jsonify({"error": True, "message": "Item tidak dalam status Rusak/Afkir"}), 400

        last = conn.execute(
            """
            SELECT damage_note FROM container_item
            WHERE id_code=? AND damage_note IS NOT NULL
            ORDER BY returned_at DESC, id DESC
            LIMIT 1
            """,
            (id_code,),
        ).fetchone()
        last_note = (last["damage_note"] if last else None) or None

        # Tentukan hasil
        if target == "good":
            result_status, result_defect = "Good", "none"
        elif target == "rusak_ringan":
            result_status, result_defect = "Rusak", "ringan"
        elif target == "broken":
            # gunakan status Afkir untuk broken/non-repairable
            result_status, result_defect = "Afkir", row["defect_level"] or "berat"
        else:
            return jsonify({"error": True, "message": "target tidak valid"}), 400

        # Simpan history
        conn.execute(
            """
            INSERT INTO item_repair_log (id_code, defect_before, status_before, last_damage_note, repair_note, result_status, result_defect, repaired_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (id_code, row["defect_level"] or None, row["status"] or None, last_note, note, result_status, result_defect, now_iso()),
        )

        # Update item
        if result_status == "Good":
            conn.execute("UPDATE item_unit SET status='Good', defect_level='none' WHERE id_code=?", (id_code,))
        elif result_status == "Rusak":
            conn.execute("UPDATE item_unit SET status='Rusak', defect_level='ringan' WHERE id_code=?", (id_code,))
        else:
            # Afkir (broken)
            conn.execute("UPDATE item_unit SET status='Afkir' WHERE id_code=?", (id_code,))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

@bp.get("/repair_history")
@auth_required
def repair_history():
    """
    List repair log terbaru. Query param: limit (default 200), q untuk filter id/nama/model/kategori.
    """
    try:
        limit = int(request.args.get("limit") or 200)
    except Exception:
        limit = 200
    if limit < 1: limit = 1
    if limit > 1000: limit = 1000

    q_raw = (request.args.get("q") or "").strip()
    tokens = [t.strip().upper() for t in q_raw.split() if t.strip()]

    conn = get_conn()
    try:
        base = (
            "FROM item_repair_log r LEFT JOIN item_unit iu ON iu.id_code=r.id_code"
        )
        where_sql = "WHERE 1=1"
        args = []
        for tok in tokens:
            like = f"%{tok}%"
            where_sql += " AND (" + " OR ".join([
                "UPPER(r.id_code) LIKE ?",
                "UPPER(iu.name) LIKE ?",
                "UPPER(iu.category) LIKE ?",
                "UPPER(iu.model) LIKE ?",
            ]) + ")"
            args += [like, like, like, like]

        rows = conn.execute(
            f"""
            SELECT r.id, r.id_code, iu.name, iu.category, iu.model,
                   r.status_before, r.defect_before, r.last_damage_note, r.repair_note, r.repaired_at,
                   r.result_status, r.result_defect
            {base} {where_sql}
            ORDER BY r.repaired_at DESC, r.id DESC
            LIMIT ?
            """,
            args + [limit],
        ).fetchall()
        return jsonify({"data": [dict(r) for r in rows]})
    finally:
        conn.close()

@bp.get("/summary_by_category_model")
@auth_required
def summary_by_category_model():
    """
    Ringkasan stok per kategori dengan breakdown per (name, model).
    Output:
    {
      "categories": [
        { "category": "Camera", "total": 50, "models": [
            {"name": "Canon", "model": "70D", "qty": 10},
            {"name": "Canon", "model": "1300D", "qty": 20},
            {"name": "Canon", "model": "1200D", "qty": 20}
        ]}
      ],
      "grand_total": 50
    }
    """
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT category, name, model, COUNT(*) AS qty
            FROM item_unit
            GROUP BY category, name, model
            ORDER BY category ASC, name ASC, model ASC
            """
        ).fetchall()

        cats = {}
        for r in rows:
            cat = r["category"] or "-"
            entry = {"name": r["name"] or "-", "model": r["model"] or "-", "qty": int(r["qty"] or 0)}
            if cat not in cats:
                cats[cat] = {"category": cat, "total": 0, "models": []}
            cats[cat]["models"].append(entry)
            cats[cat]["total"] += entry["qty"]

        categories = sorted(cats.values(), key=lambda x: x["category"])
        grand_total = sum(c["total"] for c in categories)
        return jsonify({"categories": categories, "grand_total": int(grand_total)})
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

from flask import request, jsonify
from routes_auth import auth_required, require_roles
from db import get_conn

@bp.delete("/<id_code>")   # ✅ benar → akan menjadi /items/<id_code>
@auth_required
@require_roles('admin','pic')
def delete_item(id_code):
    id_code = (id_code or "").strip()
    if not id_code:
        return jsonify({"error": True, "message": "id_code kosong"}), 400

    conn = get_conn()
    try:
        row = conn.execute("SELECT status FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak ditemukan"}), 404

        # TOLAK jika sedang Keluar (kecuali admin)
        role = str((getattr(request, 'user', {}) or {}).get('role') or '').lower()
        if (row["status"] or "").lower() == "keluar" and role != 'admin':
            return jsonify({"error": True, "message": "Item sedang dibawa event (status Keluar) — tidak bisa dihapus."}), 400

        # TOLAK jika masih tercatat aktif di kontainer (belum void)
        active = conn.execute("""
            SELECT 1 FROM container_item
            WHERE id_code=? AND voided_at IS NULL
            LIMIT 1
        """, (id_code,)).fetchone()
        if active:
            return jsonify({"error": True, "message": "Item tercatat aktif di kontainer — tidak bisa dihapus."}), 400

        conn.execute("DELETE FROM item_unit WHERE id_code=?", (id_code,))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

@bp.post("/bulk_update_condition")
@auth_required
def bulk_update_condition():
    """
    Payload:
    {
      "ids": ["CAM-70D-002", "CAM-70D-005"],
      "condition": "good" | "rusak_ringan" | "rusak_berat",
      "note": "opsional; alasan PIC (tersimpan di log server/monitoring nanti)"
    }
    """
    b = request.get_json(silent=True) or {}
    ids = b.get("ids") or []
    condition = (b.get("condition") or "").strip().lower()

    if not ids or not isinstance(ids, list):
        return jsonify({"error": True, "message": "ids (list) wajib"}), 400
    if condition not in ("good", "rusak_ringan", "rusak_berat", "hilang", "lost"):
        return jsonify({"error": True, "message": "condition tidak valid"}), 400

    # mapping condition -> (status, defect_level)
    # normalize alias
    if condition == "lost":
        condition = "hilang"

    if condition == "good":
        target_status, target_defect = "Good", "none"
    elif condition == "rusak_ringan":
        target_status, target_defect = "Rusak", "ringan"
    elif condition == "rusak_berat":
        target_status, target_defect = "Rusak", "berat"
    else:  # hilang
        target_status, target_defect = "Hilang", "none"

    conn = get_conn()
    try:
        updated, skipped = [], []

        for raw_id in ids:
            id_code = (raw_id or "").strip()
            if not id_code:
                continue

            row = conn.execute("""
              SELECT id_code, status FROM item_unit WHERE id_code=?
            """, (id_code,)).fetchone()

            if not row:
                skipped.append({"id_code": id_code, "reason": "Item tidak ditemukan"})
                continue

            # tidak boleh ubah dari Inventory kalau sedang Keluar (ada di kontainer)
            if row["status"] == "Keluar":
                skipped.append({"id_code": id_code, "reason": "Sedang Keluar (ada di kontainer)"})
                continue

            # PIC/Operator tidak boleh ubah status dari Hilang (admin boleh)
            role = str((getattr(request, 'user', {}) or {}).get('role') or '').lower()
            if role in ("pic", "operator") and (row["status"] or "") == "Hilang":
                skipped.append({"id_code": id_code, "reason": "Status Hilang hanya bisa diubah oleh admin"})
                continue

            # PIC/Operator boleh set Hilang hanya dari status Keluar (admin bebas)
            role = str((getattr(request, 'user', {}) or {}).get('role') or '').lower()
            if target_status == 'Hilang' and role in ("pic", "operator") and (row["status"] or '') != 'Keluar':
                skipped.append({"id_code": id_code, "reason": "Hilang hanya dari status Keluar (non-admin)"})
                continue

            # lakukan update
            conn.execute("""
              UPDATE item_unit SET status=?, defect_level=? WHERE id_code=?
            """, (target_status, target_defect, id_code))
            updated.append(id_code)

        conn.commit()
        return jsonify({
            "ok": True,
            "updated": updated,
            "skipped": skipped,
            "counts": {"updated": len(updated), "skipped": len(skipped)},
            "applied_condition": condition
        })
    finally:
        conn.close()


@bp.post("/mark_lost")
@auth_required
@require_roles('admin','pic','operator')
def mark_lost():
    """
    Tandai item sebagai Hilang secara manual dari Inventory.
    Aturan:
      - Hanya untuk status saat ini 'Keluar'.
      - Role: admin/pic/operator boleh menandai Hilang.
      - Tidak memodifikasi container_item; pengelolaan kontainer dilakukan terpisah.

    Payload: { ids: [id_code, ...] }
    """
    b = request.get_json(silent=True) or {}
    ids = b.get('ids') or []
    if not ids or not isinstance(ids, list):
        return jsonify({"error": True, "message": "ids (list) wajib"}), 400

    conn = get_conn()
    try:
        updated, skipped = [], []
        for raw_id in ids:
            id_code = (raw_id or '').strip()
            if not id_code:
                continue
            row = conn.execute("SELECT status FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
            if not row:
                skipped.append({"id_code": id_code, "reason": "Item tidak ditemukan"})
                continue
            cur = (row["status"] or '').strip()
            if cur != 'Keluar':
                skipped.append({"id_code": id_code, "reason": f"Status sekarang {cur or '-'} (hanya bisa dari Keluar)"})
                continue
            conn.execute("UPDATE item_unit SET status='Hilang', defect_level='none' WHERE id_code=?", (id_code,))
            updated.append(id_code)
        conn.commit()
        return jsonify({
            "ok": True,
            "updated": updated,
            "skipped": skipped,
            "counts": {"updated": len(updated), "skipped": len(skipped)}
        })
    finally:
        conn.close()


@bp.get("/<id_code>/lost_context")
@auth_required
def lost_context(id_code):
    """
    Kembalikan konteks kehilangan untuk item:
    - Kontainer terakhir tempat item aktif/lost
    - PIC, event, waktu out, catatan alasan jika ada
    """
    id_code = (id_code or '').strip()
    if not id_code:
        return jsonify({"error": True, "message": "id_code kosong"}), 400
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT ci.container_id, ci.added_at, ci.returned_at, ci.return_condition, ci.damage_note,
                   c.pic, c.event_name
            FROM container_item ci
            JOIN containers c ON c.id = ci.container_id
            WHERE ci.id_code=? AND ci.voided_at IS NULL
            ORDER BY ci.id DESC
            """,
            (id_code,),
        ).fetchall()
        if not rows:
            return jsonify({"error": True, "message": "Tidak ada riwayat kontainer untuk item ini"}), 404
        # Prioritas: explicit lost -> active (returned_at IS NULL) -> latest
        pick = None
        for r in rows:
            if str((r["return_condition"] or '')).lower() == 'hilang':
                pick = r; break
        if not pick:
            for r in rows:
                if not r["returned_at"]:
                    pick = r; break
        if not pick:
            pick = rows[0]
        data = {
            "container_id": pick["container_id"],
            "pic": pick["pic"],
            "event_name": pick["event_name"],
            "added_at": pick["added_at"],
            "returned_at": pick["returned_at"],
            "return_condition": pick["return_condition"],
            "damage_note": pick["damage_note"],
        }
        return jsonify(data)
    finally:
        conn.close()
