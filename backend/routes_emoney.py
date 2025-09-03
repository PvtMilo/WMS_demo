from flask import Blueprint, request, jsonify
from routes_auth import auth_required, require_roles
from db import get_conn, now_iso, new_emoney_id

bp = Blueprint("emoney", __name__, url_prefix="/emoney")

def _to_cents(amount):
    try:
        # Accept string/number; convert to cents (int)
        v = float(str(amount).replace(",", "."))
    except Exception:
        return None
    if v <= 0:
        return None
    return int(round(v * 100))

@bp.post("")
@auth_required
def create_emoney():
    b = request.get_json(silent=True) or {}
    label = (b.get("label") or "").strip()
    if not label:
        return jsonify({"error": True, "message": "label wajib"}), 400
    eid = new_emoney_id()
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO emoney (id, label, status, created_at) VALUES (?, ?, 'Open', ?)",
            (eid, label, now_iso()),
        )
        conn.commit()
        return jsonify({"ok": True, "id": eid})
    except Exception as e:
        return jsonify({"error": True, "message": "Gagal membuat emoney (duplikat label?)"}), 400
    finally:
        conn.close()

@bp.get("")
@auth_required
def list_emoney():
    q = (request.args.get("q") or "").strip().upper()
    page = int(request.args.get("page") or 1)
    per_page = int(request.args.get("per_page") or 20)
    if page < 1: page = 1
    if per_page < 1: per_page = 1
    if per_page > 100: per_page = 100

    conn = get_conn()
    try:
        where_sql = "WHERE 1=1"
        args = []
        if q:
            where_sql += " AND (UPPER(id) LIKE ? OR UPPER(label) LIKE ? OR UPPER(status) LIKE ?)"
            like = f"%{q}%"; args += [like, like, like]

        total = conn.execute(f"SELECT COUNT(*) c FROM emoney {where_sql}", args).fetchone()["c"]
        offset = (page - 1) * per_page
        rows = conn.execute(
            f"SELECT id, label, status, created_at FROM emoney {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            args + [per_page, offset],
        ).fetchall()

        out = []
        for r in rows:
            eid = r["id"]
            sums = conn.execute(
                """
                SELECT
                  SUM(CASE WHEN type='topup'  THEN amount_cents ELSE 0 END) AS topup,
                  SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END) AS expense,
                  COUNT(DISTINCT COALESCE(ref_container_id, '')) AS linked_count
                FROM emoney_tx WHERE emoney_id=?
                """,
                (eid,),
            ).fetchone()
            topup = int(sums["topup"] or 0)
            expense = int(sums["expense"] or 0)
            balance = topup - expense
            # linked containers all closed?
            closed = True
            if sums["linked_count"] > 0:
                cur2 = conn.execute(
                    "SELECT DISTINCT ref_container_id FROM emoney_tx WHERE emoney_id=? AND ref_container_id IS NOT NULL",
                    (eid,),
                )
                ids = [c[0] for c in cur2.fetchall() if c[0]]
                if ids:
                    marks = ",".join(["?"] * len(ids))
                    st = conn.execute(f"SELECT COUNT(*) c FROM containers WHERE id IN ({marks}) AND status!='Closed'", ids).fetchone()["c"]
                    closed = (st == 0)
            fully_closed = (expense > 0 and closed)
            out.append({
                "id": eid, "label": r["label"], "status": r["status"], "created_at": r["created_at"],
                "tot_topup": topup, "tot_expense": expense, "balance": balance,
                "linked_closed": closed, "fully_closed": fully_closed,
            })

        return jsonify({"data": out, "total": int(total), "page": page, "per_page": per_page})
    finally:
        conn.close()

@bp.get("/<eid>")
@auth_required
def get_emoney(eid):
    conn = get_conn()
    try:
        e = conn.execute("SELECT * FROM emoney WHERE id=?", (eid,)).fetchone()
        if not e:
            return jsonify({"error": True, "message": "Emoney tidak ditemukan"}), 404
        tx = conn.execute(
            """
            SELECT t.id, t.type, t.amount_cents, t.note, t.ref_container_id, t.created_at,
                   c.event_name AS event_name, c.pic AS pic
            FROM emoney_tx t
            LEFT JOIN containers c ON c.id = t.ref_container_id
            WHERE t.emoney_id=?
            ORDER BY t.created_at DESC, t.id DESC
            """,
            (eid,),
        ).fetchall()
        sums = conn.execute(
            """
            SELECT
              SUM(CASE WHEN type='topup'  THEN amount_cents ELSE 0 END) AS topup,
              SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END) AS expense
            FROM emoney_tx WHERE emoney_id=?
            """,
            (eid,),
        ).fetchone()
        topup = int(sums["topup"] or 0)
        expense = int(sums["expense"] or 0)
        balance = topup - expense
        ids = [c[0] for c in conn.execute(
            "SELECT DISTINCT ref_container_id FROM emoney_tx WHERE emoney_id=? AND ref_container_id IS NOT NULL",
            (eid,),
        ).fetchall() if c[0]]
        closed = True
        if ids:
            marks = ",".join(["?"] * len(ids))
            st = conn.execute(f"SELECT COUNT(*) c FROM containers WHERE id IN ({marks}) AND status!='Closed'", ids).fetchone()["c"]
            closed = (st == 0)
        fully_closed = (expense > 0 and closed)
        return jsonify({
            "emoney": dict(e),
            "tx": [dict(t) for t in tx],
            "tot_topup": topup, "tot_expense": expense, "balance": balance,
            "linked_containers": ids, "linked_closed": closed, "fully_closed": fully_closed,
        })
    finally:
        conn.close()

@bp.post("/<eid>/tx")
@auth_required
def add_tx(eid):
    b = request.get_json(silent=True) or {}
    ttype = (b.get("type") or "").strip().lower()
    amount = _to_cents(b.get("amount"))
    note = (b.get("note") or "").strip()
    ref_cid = (b.get("container_id") or "").strip() or None
    if ttype not in ("topup", "expense"):
        return jsonify({"error": True, "message": "type harus topup/expense"}), 400
    if amount is None:
        return jsonify({"error": True, "message": "amount harus angka > 0"}), 400
    conn = get_conn()
    try:
        e = conn.execute("SELECT id FROM emoney WHERE id=?", (eid,)).fetchone()
        if not e:
            return jsonify({"error": True, "message": "Emoney tidak ditemukan"}), 404
        if ref_cid:
            c = conn.execute("SELECT 1 FROM containers WHERE id=?", (ref_cid,)).fetchone()
            if not c:
                return jsonify({"error": True, "message": "Container tidak ditemukan"}), 400
        # Balance guard: jangan sampai minus
        if ttype == "expense":
            sums = conn.execute(
                "SELECT SUM(CASE WHEN type='topup' THEN amount_cents ELSE 0 END) topup, SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END) expense FROM emoney_tx WHERE emoney_id=?",
                (eid,),
            ).fetchone()
            balance = int(sums["topup"] or 0) - int(sums["expense"] or 0)
            if amount > balance:
                return jsonify({"error": True, "message": "Saldo tidak cukup"}), 400
        conn.execute(
            "INSERT INTO emoney_tx (emoney_id, type, amount_cents, note, ref_container_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (eid, ttype, amount, (note or None), ref_cid, now_iso()),
        )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()

@bp.post("/<eid>/set_status")
@auth_required
def set_status(eid):
    b = request.get_json(silent=True) or {}
    status = (b.get("status") or "").strip()
    if status not in ("Open", "Closed"):
        return jsonify({"error": True, "message": "Status tidak valid"}), 400
    conn = get_conn()
    try:
        e = conn.execute("SELECT status FROM emoney WHERE id=?", (eid,)).fetchone()
        if not e:
            return jsonify({"error": True, "message": "Emoney tidak ditemukan"}), 404
        if e["status"] == "Closed" and status != "Closed":
            return jsonify({"error": True, "message": "Sudah Closed"}), 400
        # Only allow closing when all linked containers are Closed and there is at least one expense
        sums = conn.execute(
            "SELECT SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END) exp FROM emoney_tx WHERE emoney_id=?",
            (eid,),
        ).fetchone()
        exp = int(sums["exp"] or 0)
        cur = conn.execute(
            "SELECT DISTINCT ref_container_id FROM emoney_tx WHERE emoney_id=? AND ref_container_id IS NOT NULL",
            (eid,),
        ).fetchall()
        ids = [c[0] for c in cur if c[0]]
        if status == "Closed":
            if exp <= 0:
                return jsonify({"error": True, "message": "Belum ada pengeluaran (expense)"}), 400
            if ids:
                marks = ",".join(["?"] * len(ids))
                st = conn.execute(f"SELECT COUNT(*) c FROM containers WHERE id IN ({marks}) AND status!='Closed'", ids).fetchone()["c"]
                if st > 0:
                    return jsonify({"error": True, "message": "Masih ada container terkait belum Closed"}), 400
        conn.execute("UPDATE emoney SET status=? WHERE id=?", (status, eid))
        conn.commit()
        return jsonify({"ok": True, "status": status})
    finally:
        conn.close()

@bp.get("/tx_by_container/<cid>")
@auth_required
def tx_by_container(cid):
    cid = (cid or "").strip()
    if not cid:
        return jsonify({"error": True, "message": "cid wajib"}), 400
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT t.id, t.type, t.amount_cents, t.note, t.created_at, t.emoney_id, e.label AS emoney_label,
                   c.event_name AS event_name, c.pic AS pic
            FROM emoney_tx t
            LEFT JOIN emoney e ON e.id = t.emoney_id
            LEFT JOIN containers c ON c.id = t.ref_container_id
            WHERE t.ref_container_id=?
            ORDER BY t.created_at DESC, t.id DESC
            """,
            (cid,),
        ).fetchall()
        sums = conn.execute(
            "SELECT SUM(CASE WHEN type='topup' THEN amount_cents ELSE 0 END) topup, SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END) expense FROM emoney_tx WHERE ref_container_id=?",
            (cid,),
        ).fetchone()
        return jsonify({
            "data": [dict(r) for r in rows],
            "sum_topup": int(sums["topup"] or 0),
            "sum_expense": int(sums["expense"] or 0),
        })
    finally:
        conn.close()

@bp.delete("/<eid>")
@auth_required
@require_roles('admin')
def delete_emoney(eid):
    eid = (eid or "").strip()
    if not eid:
        return jsonify({"error": True, "message": "id wajib"}), 400
    conn = get_conn()
    try:
        row = conn.execute("SELECT id FROM emoney WHERE id=?", (eid,)).fetchone()
        if not row:
            return jsonify({"error": True, "message": "Emoney tidak ditemukan"}), 404
        # Hapus semua transaksi dulu agar tidak ada orphan
        conn.execute("DELETE FROM emoney_tx WHERE emoney_id=?", (eid,))
        conn.execute("DELETE FROM emoney WHERE id=?", (eid,))
        conn.commit()
        return jsonify({"ok": True})
    finally:
        conn.close()
