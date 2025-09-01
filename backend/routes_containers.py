# backend/routes_containers.py
from flask import Blueprint, request, jsonify
from routes_auth import auth_required
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

# ---------- List containers ----------
@bp.get("")
@auth_required
def list_containers():
    q = (request.args.get("q") or "").strip().upper()
    status = (request.args.get("status") or "").strip().title()
    sql = "SELECT id, event_name, pic, crew, location, start_date, end_date, status, created_at FROM containers"
    args, filters = [], []
    if q:
        filters.append("(UPPER(id) LIKE ? OR UPPER(event_name) LIKE ? OR UPPER(location) LIKE ? OR UPPER(pic) LIKE ?)")
        like = f"%{q}%"
        args += [like, like, like, like]
    if status in ("Open", "Closed"):
        filters.append("status=?")
        args.append(status)
    if filters:
        sql += " WHERE " + " AND ".join(filters)
    sql += " ORDER BY created_at DESC"

    conn = get_conn()
    try:
        rows = conn.execute(sql, args).fetchall()
        return jsonify({"data": [dict(r) for r in rows]})
    finally:
        conn.close()

# ---------- Build live detail ----------
def _build_detail(conn, cid):
    c = conn.execute("SELECT * FROM containers WHERE id=?", (cid,)).fetchone()
    if not c: return None, None, None

    rows = conn.execute("""
        SELECT ci.id, ci.id_code, ci.added_at, ci.batch_label, ci.condition_at_checkout,
               ci.override_reason, ci.voided_at,
               ci.returned_at, ci.return_condition, ci.damage_note,
               iu.name, iu.model, iu.rack
        FROM container_item ci
        LEFT JOIN item_unit iu ON iu.id_code = ci.id_code
        WHERE ci.container_id=?
        ORDER BY ci.added_at ASC, ci.id ASC
    """, (cid,)).fetchall()

    batches, totals = {}, {"returned":0, "good":0, "rusak_ringan":0, "rusak_berat":0, "lost":0, "out":0, "all":0}
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
            "added_at": d["added_at"],
            "condition": d.get("condition_at_checkout") or "good",
            "reason": d.get("override_reason") or "",
            "returned_at": d.get("returned_at"),
            "return_condition": d.get("return_condition"),
            "damage_note": d.get("damage_note"),
        })
        if d.get("returned_at"):
            rc = (d.get("return_condition") or "good")
            if rc in totals:
                totals[rc] += 1
            totals["returned"] += 1
        else:
            totals["out"] += 1
        cond = d.get("return_condition") or d.get("condition_at_checkout") or "good"
        if cond in totals:
            totals[cond] += 1
        totals["all"] += 1

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
        # latest snapshot (if any)
        snap = conn.execute("SELECT version, created_at FROM dn_snapshots WHERE container_id=? ORDER BY version DESC LIMIT 1", (cid,)).fetchone()
        latest = dict(snap) if snap else None
        return jsonify({"container": c, "batches": batches, "totals": totals, "latest_dn": latest})
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

    if not ids or not isinstance(ids, list):
        return jsonify({"error": True, "message": "ids (list) wajib"}), 400

    conn = get_conn()
    try:
        c = conn.execute("SELECT status FROM containers WHERE id=?", (cid,)).fetchone()
        if not c:
            return jsonify({"error": True, "message": "Kontainer tidak ditemukan"}), 404
        if c["status"] != "Open":
            return jsonify({"error": True, "message": "Kontainer sudah ditutup"}), 400

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
              INSERT INTO container_item (container_id, id_code, added_at, batch_label, condition_at_checkout, override_reason)
              VALUES (?, ?, ?, ?, ?, ?)
            """, (cid, id_code, now_iso(), batch_label, condition, override_reason if condition=="rusak_berat" else None))

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
        row = conn.execute("""
            SELECT id FROM container_item 
            WHERE container_id=? AND id_code=? AND voided_at IS NULL
        """, (cid, id_code)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak aktif di kontainer"}), 404

        # void + revert item status -> Good
        conn.execute("UPDATE container_item SET voided_at=?, void_reason=? WHERE id=?", (now_iso(), reason, row["id"]))
        conn.execute("UPDATE item_unit SET status='Good' WHERE id_code=?", (id_code,))
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
    condition = (b.get("condition") or "good").strip()
    note = (b.get("damage_note") or "").strip()

    if not id_code:
        return jsonify({"error": True, "message": "id_code wajib"}), 400

    if condition not in ("good", "rusak_ringan", "rusak_berat", "lost"):

    if condition not in ("good", "rusak_ringan", "rusak_berat"):

        return jsonify({"error": True, "message": "condition tidak valid"}), 400

    conn = get_conn()
    try:
        row = conn.execute("""
            SELECT id FROM container_item
            WHERE container_id=? AND id_code=? AND voided_at IS NULL
        """, (cid, id_code)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Item tidak aktif di kontainer"}), 404

        conn.execute(
            "UPDATE container_item SET returned_at=?, return_condition=?, damage_note=? WHERE id=?",
            (now_iso(), condition, note or None, row["id"]),
        )

        if condition == "good":
            conn.execute(
                "UPDATE item_unit SET status='Good', defect_level='none' WHERE id_code=?",
                (id_code,),
            )
        elif condition == "lost":
            conn.execute(
                "UPDATE item_unit SET status='Hilang', defect_level='none' WHERE id_code=?",
                (id_code,),
            )
        else:
            level = "ringan" if condition == "rusak_ringan" else "berat"
            conn.execute(
                "UPDATE item_unit SET status='Rusak', defect_level=? WHERE id_code=?",
                (level, id_code),
            )

        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

# ---------- Close container manually ----------
@bp.post("/<cid>/close")
@auth_required
def close_container(cid):
    conn = get_conn()
    try:

        left = conn.execute(
            """SELECT COUNT(*) c FROM container_item
                WHERE container_id=? AND voided_at IS NULL AND returned_at IS NULL""",
            (cid,),
        ).fetchone()["c"]

        if left > 0:
            return jsonify({"error": True, "message": "Masih ada barang Out"}), 400
        conn.execute("UPDATE containers SET status='Closed' WHERE id=?", (cid,))

        if left == 0:
            conn.execute("UPDATE containers SET status='Closed' WHERE id=?", (cid,))


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
