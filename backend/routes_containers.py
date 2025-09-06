# backend/routes_containers.py
from flask import Blueprint, request, jsonify
from routes_auth import auth_required, require_roles
from db import get_conn, now_iso, new_container_id
from datetime import datetime
import json

bp = Blueprint("containers", __name__, url_prefix="/containers")

# ---------- Create container ----------
@bp.post("")
@auth_required
def create_container():
    b = request.get_json(silent=True) or {}
    if not b.get("event_name") or not b.get("pic"):
        return jsonify({"error": True, "message": "event_name & pic wajib"}), 400

    cid = new_container_id()
    conn = get_conn()
    try:
        conn.execute("""
          INSERT INTO containers (id, event_name, pic, crew, location, start_date, end_date, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)
        """, (
            cid,
            (b.get("event_name") or "").strip(),
            (b.get("pic") or "").strip(),
            (b.get("crew") or "").strip(),
            (b.get("location") or "").strip(),
            (b.get("start_date") or "").strip(),
            (b.get("end_date") or "").strip(),
            now_iso(),
        ))
        conn.commit()
        return jsonify({"ok": True, "id": cid})
    finally:
        conn.close()

# ---------- Simple metrics for dashboard ----------
@bp.get("/metrics")
@auth_required
def containers_metrics():
    """Lightweight counts for dashboard KPIs.
    - open: containers with status 'Open'
    - running: containers with status 'Sedang Berjalan'
    - closed_without_expense: containers 'Closed' that have no emoney expense recorded
    """
    conn = get_conn()
    try:
        open_count = conn.execute("SELECT COUNT(*) c FROM containers WHERE status='Open'").fetchone()["c"]
        running_count = conn.execute("SELECT COUNT(*) c FROM containers WHERE status='Sedang Berjalan'").fetchone()["c"]
        closed_wo_exp = conn.execute(
            """
            SELECT COUNT(*) c
            FROM containers c
            WHERE c.status='Closed'
              AND 0 = (
                SELECT COUNT(*) FROM emoney_tx t
                WHERE t.ref_container_id = c.id AND t.type='expense'
              )
            """
        ).fetchone()["c"]

        return jsonify({
            "open": int(open_count or 0),
            "running": int(running_count or 0),
            "closed_without_expense": int(closed_wo_exp or 0),
        })
    finally:
        conn.close()

# ---------- List containers ----------
@bp.get("")
@auth_required
def list_containers():
    q = (request.args.get("q") or "").strip().upper()
    status = (request.args.get("status") or "").strip().title()
    fully_closed = (request.args.get("fully_closed") or "").strip().lower() in ("1", "true", "yes", "y")
    page = int(request.args.get("page") or 1)
    per_page = int(request.args.get("per_page") or 20)
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1
    if per_page > 100:
        per_page = 100

    base = "FROM containers"
    args, filters = [], []
    if q:
        filters.append("(UPPER(id) LIKE ? OR UPPER(event_name) LIKE ? OR UPPER(location) LIKE ? OR UPPER(pic) LIKE ?)")
        like = f"%{q}%"
        args += [like, like, like, like]
    # Apply status filter unless fully_closed scope is requested
    if not fully_closed and status in ("Open", "Closed", "Sedang Berjalan"):
        filters.append("status=?")
        args.append(status)
    # Fully Closed: Closed AND has at least one emoney expense recorded
    if fully_closed:
        filters.append("status='Closed'")
        filters.append("EXISTS (SELECT 1 FROM emoney_tx t WHERE t.ref_container_id=containers.id AND t.type='expense')")
    where_sql = " WHERE " + " AND ".join(filters) if filters else ""

    sql = (
        "SELECT id, event_name, pic, crew, location, start_date, end_date, status, created_at, "
        "(SELECT COUNT(*) FROM emoney_tx t WHERE t.ref_container_id=containers.id AND t.type='expense') AS emoney_expenses "
        + base
        + where_sql
        + " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )

    conn = get_conn()
    try:
        total = conn.execute(f"SELECT COUNT(*) c {base}{where_sql}", args).fetchone()["c"]
        offset = (page - 1) * per_page
        rows = conn.execute(sql, args + [per_page, offset]).fetchall()
        return jsonify({
            "data": [dict(r) for r in rows],
            "total": int(total),
            "page": page,
            "per_page": per_page,
        })
    finally:
        conn.close()

# ---------- Build live detail ----------
def _build_detail(conn, cid):
    c = conn.execute("SELECT * FROM containers WHERE id=?", (cid,)).fetchone()
    if not c: return None, None, None

    rows = conn.execute("""
        SELECT ci.id, ci.id_code, ci.added_at, ci.batch_label, ci.condition_at_checkout,
               ci.override_reason, ci.amend_reason, ci.voided_at,
               ci.returned_at, ci.return_condition, ci.damage_note,
               iu.name, iu.model, iu.rack, iu.category
        FROM container_item ci
        LEFT JOIN item_unit iu ON iu.id_code = ci.id_code
        WHERE ci.container_id=?
        ORDER BY ci.added_at ASC, ci.id ASC
    """, (cid,)).fetchall()

    batches, totals = {}, {"returned":0, "good":0, "rusak_ringan":0, "rusak_berat":0, "all":0}
    for r in rows:
        d = dict(r)
        if d["voided_at"]:
            continue
        bl = d["batch_label"]
        batches.setdefault(bl, [])
        batches[bl].append({
            "id_code": d["id_code"],
            "name": d.get("name"),
            "model": d.get("model"),
            "rack": d.get("rack"),
            "category": d.get("category"),
            "added_at": d["added_at"],
            "condition": d.get("condition_at_checkout") or "good",
            # simpan kedua jenis alasan agar UI bisa menampilkan sesuai konteks
            "reason": d.get("override_reason") or "",  # kompatibilitas lama
            "amend_reason": d.get("amend_reason") or "",
            "returned_at": d.get("returned_at"),
            "return_condition": d.get("return_condition"),
            "damage_note": d.get("damage_note"),
        })

        totals["all"] += 1
        if d.get("returned_at"):
            totals["returned"] += 1
            rc = d.get("return_condition") or "good"
            if rc in totals:
                totals[rc] += 1

    return dict(c), batches, totals

# ---------- Get container detail (live, not snapshot) ----------
@bp.get("/<cid>")
@auth_required
def get_container(cid):
    conn = get_conn()
    try:
        c, batches, totals = _build_detail(conn, cid)
        if not c:
            return jsonify({"error": True, "message": "Kontainer tidak ditemukan"}), 404
        # latest snapshot (if any) and count
        snap = conn.execute("SELECT version, created_at FROM dn_snapshots WHERE container_id=? ORDER BY version DESC LIMIT 1", (cid,)).fetchone()
        latest = dict(snap) if snap else None
        dn_count = conn.execute("SELECT COUNT(*) c FROM dn_snapshots WHERE container_id=?", (cid,)).fetchone()["c"]
        return jsonify({"container": c, "batches": batches, "totals": totals, "latest_dn": latest, "dn_count": int(dn_count)})
    finally:
        conn.close()

# ---------- Add items (checkout / amend) ----------
@bp.post("/<cid>/add_items")
@auth_required
def add_items(cid):
    b = request.get_json(silent=True) or {}
    ids = b.get("ids") or []
    is_amend = bool(b.get("amend") or False)
    override_heavy = bool(b.get("override_heavy") or False)
    override_reason = (b.get("override_reason") or "").strip()
    amend_reason = (b.get("amend_reason") or "").strip()

    if not ids or not isinstance(ids, list):
        return jsonify({"error": True, "message": "ids (list) wajib"}), 400

    conn = get_conn()
    try:
        c = conn.execute("SELECT status FROM containers WHERE id=?", (cid,)).fetchone()
        if not c:
            return jsonify({"error": True, "message": "Kontainer tidak ditemukan"}), 404
        if c["status"] not in ("Open", "Sedang Berjalan"):
            return jsonify({"error": True, "message": "Kontainer tidak dalam status yang bisa ditambah (Open/Sedang Berjalan)"}), 400

        # tentukan batch label
        if is_amend:
            batch_label = "AMEND-" + datetime.now().strftime("%Y%m%d-%H%M")
        else:
            batch_label = "MAIN"

        added, skipped = [], []
        for raw in ids:
            id_code = (raw or "").strip()
            if not id_code: 
                continue

            # unique in container (active only)
            already = conn.execute("""
                SELECT 1 FROM container_item WHERE container_id=? AND id_code=? AND voided_at IS NULL
            """, (cid, id_code)).fetchone()
            if already:
                skipped.append({"id_code": id_code, "reason": "Sudah ada di kontainer"})
                continue

            row = conn.execute("SELECT status, defect_level FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
            if not row:
                skipped.append({"id_code": id_code, "reason": "Item tidak ditemukan"})
                continue

            status = row["status"]
            defect = (row["defect_level"] or "none")

            # status rules
            if status in ("Hilang", "Afkir"):
                skipped.append({"id_code": id_code, "reason": f"Status {status} tidak bisa checkout"})
                continue
            if status == "Keluar":
                skipped.append({"id_code": id_code, "reason": "Item sudah Keluar"})
                continue

            # condition at checkout
            if status == "Rusak" or defect in ("ringan", "berat"):
                if defect == "berat":
                    if not override_heavy or not override_reason:
                        skipped.append({"id_code": id_code, "reason": "Rusak berat butuh konfirmasi & alasan"})
                        continue
                    condition = "rusak_berat"
                else:
                    condition = "rusak_ringan"
            else:
                condition = "good"

            # insert
            conn.execute("""
              INSERT INTO container_item (container_id, id_code, added_at, batch_label, condition_at_checkout, override_reason, amend_reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                cid,
                id_code,
                now_iso(),
                batch_label,
                condition,
                (override_reason if condition == "rusak_berat" else None),
                (amend_reason if is_amend else None),
            ))

            # set status item -> Keluar
            conn.execute("UPDATE item_unit SET status='Keluar' WHERE id_code=?", (id_code,))
            added.append({"id_code": id_code, "condition": condition})

        conn.commit()

        # added counts
        counts = {"good":0, "rusak_ringan":0, "rusak_berat":0}
        for a in added:
            counts[a["condition"]] += 1

        return jsonify({"ok": True, "added": added, "added_counts": counts, "skipped": skipped, "batch": batch_label})
    finally:
        conn.close()

# ---------- Void (batalkan item salah input) ----------
@bp.post("/<cid>/void_item")
@auth_required
def void_item(cid):
    b = request.get_json(silent=True) or {}
    id_code = (b.get("id_code") or "").strip()
    reason = (b.get("reason") or "mis-scan").strip()

    if not id_code:
        return jsonify({"error": True, "message": "id_code wajib"}), 400

    conn = get_conn()
    try:
        row = conn.execute(
            """
            SELECT id, condition_at_checkout, returned_at, return_condition FROM container_item
            WHERE container_id=? AND id_code=? AND voided_at IS NULL
            """,
            (cid, id_code),
        ).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak aktif di kontainer"}), 404

        # Void entry & revert item_unit status to condition before checkout
        conn.execute(
            "UPDATE container_item SET voided_at=?, void_reason=? WHERE id=?",
            (now_iso(), reason, row["id"]),
        )

        prev = (row["condition_at_checkout"] or "good").strip()
        already_returned = bool(row["returned_at"])
        if prev == "good":
            conn.execute(
                "UPDATE item_unit SET status='Good', defect_level='none' WHERE id_code=?",
                (id_code,),
            )
        elif prev == "rusak_ringan":
            conn.execute(
                "UPDATE item_unit SET status='Rusak', defect_level='ringan' WHERE id_code=?",
                (id_code,),
            )
        elif prev == "rusak_berat":
            conn.execute(
                "UPDATE item_unit SET status='Rusak', defect_level='berat' WHERE id_code=?",
                (id_code,),
            )
        else:
            # fallback: jaga-jaga jika ada nilai lain, anggap Good
            conn.execute(
                "UPDATE item_unit SET status='Good', defect_level='none' WHERE id_code=?",
                (id_code,),
            )

        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

# ---------- Check-in item ----------
@bp.post("/<cid>/checkin")
@auth_required
def checkin_item(cid):
    b = request.get_json(silent=True) or {}
    id_code = (b.get("id_code") or "").strip()
    condition = (b.get("condition") or "good").strip().lower()
    note = (b.get("damage_note") or "").strip()

    if not id_code:
        return jsonify({"error": True, "message": "id_code wajib"}), 400
    if condition not in ("good", "rusak_ringan", "rusak_berat", "lost", "hilang"):
        return jsonify({"error": True, "message": "condition tidak valid"}), 400

    conn = get_conn()
    try:
        row = conn.execute(
            """
            SELECT id, condition_at_checkout, returned_at, return_condition FROM container_item
            WHERE container_id=? AND id_code=? AND voided_at IS NULL
            """,
            (cid, id_code),
        ).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak aktif di kontainer"}), 404

        prev = (row["condition_at_checkout"] or "good").strip()
        already_returned = bool(row["returned_at"])
        role = str((getattr(request, 'user', {}) or {}).get('role') or '').lower()
        # Allowed transitions
        if not already_returned:
            allowed = set()  # only 'lost' allowed via separate check below
        else:
            current = (row["return_condition"] or "good").strip().lower()
            allowed = {"good", "rusak_ringan", "rusak_berat"}
            if role in ("pic", "operator"):
                if current == 'rusak_berat':
                    allowed = {"rusak_berat"}
                elif current == 'rusak_ringan':
                    allowed = {"rusak_ringan", "rusak_berat"}
                else:  # good
                    allowed = {"good", "rusak_ringan", "rusak_berat"}

        # Non-returned: only lost is allowed (for all roles)
        if not already_returned and condition not in ("lost", "hilang"):
            return jsonify({"error": True, "message": "Item belum kembali. Hanya bisa ditandai Hilang."}), 400

        # Allow 'lost/hilang' regardless of allowed set
        if condition in ("lost", "hilang"):
            pass
        elif condition not in allowed:
            return jsonify({
                "error": True,
                "message": f"Perubahan kondisi tidak diizinkan (dari {prev} ke {condition})"
            }), 400

        # Update container_item: for 'lost/hilang' do not set returned_at (keep as Out but marked lost)
        if condition in ("lost", "hilang"):
            conn.execute(
                "UPDATE container_item SET return_condition=?, damage_note=? WHERE id=?",
                ("hilang", note or None, row["id"]),
            )
        else:
            conn.execute(
                "UPDATE container_item SET returned_at=?, return_condition=?, damage_note=? WHERE id=?",
                (now_iso(), condition, note or None, row["id"]),
            )

        # Role-based guard: PIC/Operator tidak boleh mengubah status item yang sudah 'Hilang' dari Inventory
        cur_item = conn.execute("SELECT status FROM item_unit WHERE id_code=?", (id_code,)).fetchone()
        if role in ("pic", "operator") and cur_item and (cur_item["status"] or "") == "Hilang":
            return jsonify({"error": True, "message": "Status Hilang hanya bisa diubah oleh admin"}), 403

        # Require reason for rusak/lost unless equal to previous checkout condition (rusak->same rusak)
        if condition in ("rusak_ringan", "rusak_berat", "lost", "hilang") and not note:
            if not (condition in ("rusak_ringan", "rusak_berat") and condition == prev):
                return jsonify({"error": True, "message": "Alasan wajib untuk kondisi rusak/hilang"}), 400

        if condition == "good":
            conn.execute(
                "UPDATE item_unit SET status='Good', defect_level='none' WHERE id_code=?",
                (id_code,),
            )
        elif condition in ("rusak_ringan", "rusak_berat"):
            level = "ringan" if condition == "rusak_ringan" else "berat"
            conn.execute(
                "UPDATE item_unit SET status='Rusak', defect_level=? WHERE id_code=?",
                (level, id_code),
            )
        else:  # lost/hilang
            conn.execute(
                "UPDATE item_unit SET status='Hilang', defect_level='none' WHERE id_code=?",
                (id_code,),
            )

        # Jangan auto-close ketika semua sudah returned; penutupan dilakukan manual via tombol di UI

        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

# ---------- Submit DN (create immutable snapshot version) ----------
@bp.post("/<cid>/submit_dn")
@auth_required
def submit_dn(cid):
    conn = get_conn()
    try:
        c, batches, totals = _build_detail(conn, cid)
        if not c:
            return jsonify({"error": True, "message": "Kontainer tidak ditemukan"}), 404
        # version next
        last = conn.execute("SELECT MAX(version) v FROM dn_snapshots WHERE container_id=?", (cid,)).fetchone()
        nextv = int(last["v"] or 0) + 1

        payload = {
            "container": {
                "id": c["id"], "event_name": c["event_name"], "pic": c["pic"], "crew": c["crew"],
                "location": c["location"], "start_date": c["start_date"], "end_date": c["end_date"],
                "status": c["status"], "created_at": c["created_at"]
            },
            "batches": batches,
            "totals": totals,
            "note": "Snapshot DN versi %d" % nextv
        }
        conn.execute("""
          INSERT INTO dn_snapshots (container_id, version, payload, created_at, created_by)
          VALUES (?, ?, ?, ?, ?)
        """, (cid, nextv, json.dumps(payload), now_iso(), None))
        conn.commit()
        return jsonify({"ok": True, "version": nextv})
    finally:
        conn.close()

# ---------- Get latest DN snapshot (for printing) ----------
@bp.get("/<cid>/dn_latest")
@auth_required
def dn_latest(cid):
    conn = get_conn()
    try:
        row = conn.execute("""
          SELECT version, payload, created_at FROM dn_snapshots
          WHERE container_id=? ORDER BY version DESC LIMIT 1
        """, (cid,)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Belum ada DN"}), 404
        data = json.loads(row["payload"])
        data["_meta"] = {"version": row["version"], "created_at": row["created_at"]}
        return jsonify(data)
    finally:
        conn.close()

# ---------- Get DN snapshot by version ----------
@bp.get("/<cid>/dn/<ver>")
@auth_required
def dn_by_version(cid, ver):
    try:
        ver = int(ver)
    except Exception:
        return jsonify({"error": True, "message": "Version tidak valid"}), 400
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT version, payload, created_at FROM dn_snapshots WHERE container_id=? AND version=?",
            (cid, ver),
        ).fetchone()
        if not row:
            return jsonify({"error": True, "message": "DN versi tidak ditemukan"}), 404
        data = json.loads(row["payload"])
        data["_meta"] = {"version": row["version"], "created_at": row["created_at"]}
        return jsonify(data)
    finally:
        conn.close()

# ---------- List DN snapshots (for audit) ----------
@bp.get("/<cid>/dn_list")
@auth_required
def dn_list(cid):
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT version, created_at, payload FROM dn_snapshots WHERE container_id=? ORDER BY version ASC",
            (cid,),
        ).fetchall()
        out = []
        for r in rows:
            p = json.loads(r["payload"]) if r["payload"] else {}
            out.append({
                "version": r["version"],
                "created_at": r["created_at"],
                "payload": p,
            })
        return jsonify({"versions": out})
    finally:
        conn.close()

# ---------- Set container status ----------
@bp.post("/<cid>/set_status")
@auth_required
def set_status(cid):
    b = request.get_json(silent=True) or {}
    status = (b.get("status") or "").strip()
    allowed = {"Open", "Sedang Berjalan", "Closed"}
    if status not in allowed:
        return jsonify({"error": True, "message": "Status tidak valid"}), 400

    conn = get_conn()
    try:
        c = conn.execute("SELECT status FROM containers WHERE id=?", (cid,)).fetchone()
        if not c:
            return jsonify({"error": True, "message": "Kontainer tidak ditemukan"}), 404
        cur = c["status"]
        if cur == "Closed" and status != "Closed":
            return jsonify({"error": True, "message": "Kontainer sudah Closed"}), 400

        # If closing, ensure all returned
        if status == "Closed":
            left = conn.execute(
                """SELECT COUNT(*) c FROM container_item
                    WHERE container_id=? AND voided_at IS NULL AND returned_at IS NULL""",
                (cid,),
            ).fetchone()["c"]
            if left > 0:
                return jsonify({"error": True, "message": "Masih ada item belum kembali"}), 400

        # Require DN snapshot before moving to "Sedang Berjalan"
        if status == "Sedang Berjalan":
            dn_count = conn.execute(
                "SELECT COUNT(*) c FROM dn_snapshots WHERE container_id=?",
                (cid,),
            ).fetchone()["c"]
            if int(dn_count or 0) <= 0:
                return jsonify({"error": True, "message": "Buat Surat Jalan (DN) terlebih dahulu"}), 400

        conn.execute("UPDATE containers SET status=? WHERE id=?", (status, cid))
        conn.commit()
        return jsonify({"ok": True, "status": status})
    finally:
        conn.close()

# ---------- Delete container (admin only, safe) ----------
@bp.delete("/<cid>")
@auth_required
@require_roles('admin')
def delete_container(cid):
    cid = (cid or '').strip()
    if not cid:
        return jsonify({"error": True, "message": "cid wajib"}), 400
    conn = get_conn()
    try:
        c = conn.execute("SELECT status FROM containers WHERE id=?", (cid,)).fetchone()
        if not c:
            return jsonify({"error": True, "message": "Kontainer tidak ditemukan"}), 404
        # Delete children then parent; unlink emoney tx
        conn.execute("DELETE FROM container_item WHERE container_id=?", (cid,))
        conn.execute("DELETE FROM dn_snapshots   WHERE container_id=?", (cid,))
        conn.execute("UPDATE emoney_tx SET ref_container_id=NULL WHERE ref_container_id=?", (cid,))
        conn.execute("DELETE FROM containers WHERE id=?", (cid,))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()
