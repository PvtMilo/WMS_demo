from flask import Blueprint, request, jsonify
from routes_auth import auth_required
from db import get_conn, DB_PATH, now_iso
import os, shutil, datetime
import json

bp = Blueprint("admin_cleanup", __name__, url_prefix="/admin")


def ok(data=None, status=200):
    return jsonify(data or {"ok": True}), status

def _parse_date(d: str):
    if not d:
        return None
    try:
        return datetime.datetime.fromisoformat(d[:10])
    except Exception:
        return None

def _iso_start(d: datetime.datetime):
    return d.strftime("%Y-%m-%dT00:00:00")

def _iso_end(d: datetime.datetime):
    return d.strftime("%Y-%m-%dT00:00:00")

def _ensure_snapshots_dir():
    snap_dir = os.path.join(os.path.dirname(DB_PATH), "snapshots")
    os.makedirs(snap_dir, exist_ok=True)
    return snap_dir

def _load_json_safe(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

_MONTHS_ID = [
    None,
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

def _fmt_id_time(dt: datetime.datetime) -> str:
    try:
        d = dt.day
        m = _MONTHS_ID[dt.month]
        y = dt.year
        hh = f"{dt.hour:02d}"
        mm = f"{dt.minute:02d}"
        return f"{d} {m} {y} | {hh}:{mm} Wib"
    except Exception:
        return dt.isoformat(timespec="minutes")

def _make_snapshot(note: str | None = None):
    snap_dir = _ensure_snapshots_dir()
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base = f"snapshot_{ts}.sqlite3"
    dst = os.path.join(snap_dir, base)
    # Ensure all writes flushed by copying while DB is not locked (best effort in dev)
    shutil.copy2(DB_PATH, dst)
    # Write simple manifest
    man_path = os.path.join(snap_dir, f"snapshot_{ts}.json")
    nowdt = datetime.datetime.now()
    try:
        with open(man_path, "w", encoding="utf-8") as f:
            json.dump({
                "id": f"snapshot_{ts}",
                "id_display": f"Snapshot { _fmt_id_time(nowdt) }",
                "db_file": base,
                "note": note,
                "created_at": now_iso(),
                "created_at_fmt": _fmt_id_time(nowdt),
            }, f)
    except Exception:
        pass
    return {"id": f"snapshot_{ts}", "file": base}


# --------- CLEANUP PREVIEW/RUN/BATCHES ---------
@bp.get("/cleanup/preview")
@auth_required
def cleanup_preview():
    # Minimal stub response so frontend can integrate
    start = request.args.get("start")
    end = request.args.get("end")
    em_scope = request.args.get("emoney_scope", "")
    include_containers = request.args.get("include_containers", "0") == "1"
    include_emoney = request.args.get("include_emoney", "0") == "1"
    resp = {
        "start": start, "end": end,
        "include_containers": include_containers,
        "include_emoney": include_emoney,
        "emoney_scope": em_scope,
        "summary": {
            "containers": {"count": 0},
            "emoney": {"accounts": [], "delta_ok": True},
        },
        "excluded": [],
        "warnings": [],
    }
    return ok(resp)


@bp.post("/cleanup/run")
@auth_required
def cleanup_run():
    b = request.get_json(silent=True) or {}
    start = _parse_date(str(b.get("start") or ""))
    end = _parse_date(str(b.get("end") or ""))
    if not start or not end or end <= start:
        return jsonify({"error": True, "message": "start/end tidak valid"}), 400
    include_containers = bool(b.get("include_containers", True))
    include_emoney = bool(b.get("include_emoney", True))
    scope = b.get("emoney_scope") or []
    if isinstance(scope, str):
        scope = [s.strip() for s in scope.split(",") if s.strip()]
    scope = set(scope)
    if include_emoney and not scope:
        # default to linked only
        scope = {"linked"}

    S = _iso_start(start)
    E = _iso_end(end)

    conn = get_conn()
    try:
        # Collect candidate containers (Closed, no outstanding, has emoney tx)
        cur = conn.execute(
            """
            SELECT c.id,
                   (SELECT MAX(returned_at) FROM container_item ci WHERE ci.container_id=c.id AND ci.voided_at IS NULL) AS last_returned_at,
                   (SELECT MAX(created_at) FROM emoney_tx t WHERE t.ref_container_id=c.id) AS last_tx_at,
                   (SELECT COUNT(*) FROM container_item ci2 WHERE ci2.container_id=c.id AND ci2.voided_at IS NULL AND ci2.returned_at IS NULL) AS left_count,
                   (SELECT COUNT(*) FROM emoney_tx t2 WHERE t2.ref_container_id=c.id) AS tx_count
            FROM containers c
            WHERE c.status='Closed'
            """
        )
        rows = cur.fetchall()
        from_date = datetime.datetime.fromisoformat(S)
        to_date = datetime.datetime.fromisoformat(E)
        selected = []
        for r in rows:
            left_cnt = int(r["left_count"] or 0)
            tx_cnt = int(r["tx_count"] or 0)
            if left_cnt != 0 or tx_cnt == 0:
                continue
            last_ret = r["last_returned_at"]
            last_tx = r["last_tx_at"]
            fc_ts = None
            for t in (last_ret, last_tx):
                if t:
                    try:
                        dt = datetime.datetime.fromisoformat(t)
                    except Exception:
                        dt = None
                    if dt and (fc_ts is None or dt > fc_ts):
                        fc_ts = dt
            if not fc_ts:
                continue
            if from_date <= fc_ts < to_date:
                selected.append(r["id"])

        # Always create snapshot before any destructive ops
        snap = _make_snapshot(b.get("note"))

        res = {
            "batch_id": b.get("note") or f"batch-{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "snapshot": snap,
            "selected_containers": selected,
            "deleted": {"containers": 0, "container_items": 0, "dn_snapshots": 0, "emoney_tx_removed": 0},
            "cf_inserted": 0,
        }

        # Build emoney tx removal set
        tx_ids = set()
        tx_rows = []
        if include_emoney and (selected or ("all" in scope)):
            if "linked" in scope:
                # linked to selected containers and within window
                marks = ",".join(["?"] * len(selected))
                q = (
                    f"SELECT id, emoney_id, type, amount_cents FROM emoney_tx "
                    f"WHERE ref_container_id IN ({marks}) AND created_at>=? AND created_at<? "
                    f"AND (type='topup' OR type='expense') "
                    f"AND (note IS NULL OR note NOT LIKE 'archive_carry_forward%')"
                )
                for r in conn.execute(q, (*selected, S, E)).fetchall():
                    if r["id"] not in tx_ids:
                        tx_ids.add(r["id"])
                        tx_rows.append(dict(r))
            if "all" in scope:
                q = (
                    "SELECT id, emoney_id, type, amount_cents FROM emoney_tx "
                    "WHERE created_at>=? AND created_at<? AND (type='topup' OR type='expense') "
                    "AND (note IS NULL OR note NOT LIKE 'archive_carry_forward%')"
                )
                for r in conn.execute(q, (S, E)).fetchall():
                    if r["id"] not in tx_ids:
                        tx_ids.add(r["id"])
                        tx_rows.append(dict(r))

            # Compute net per emoney account for this window
            net = {}
            for r in tx_rows:
                eid = r["emoney_id"]
                amt = int(r["amount_cents"] or 0)
                if r["type"] == "topup":
                    net[eid] = net.get(eid, 0) + amt
                elif r["type"] == "expense":
                    net[eid] = net.get(eid, 0) - amt

            impacted = set(net.keys())
            # Fold previous carry-forwards: delete old CF entries and insert single consolidated CF per account
            combined = {}
            eids_with_old_cf = []
            for eid in impacted:
                row = conn.execute(
                    "SELECT SUM(CASE WHEN type='topup' THEN amount_cents ELSE -amount_cents END) s FROM emoney_tx WHERE emoney_id=? AND note LIKE 'archive_carry_forward%'",
                    (eid,),
                ).fetchone()
                old_net = int(row["s"] or 0)
                new_net = int(net.get(eid, 0) or 0)
                combined[eid] = old_net + new_net
                if old_net != 0:
                    eids_with_old_cf.append(eid)

            if eids_with_old_cf:
                marks = ",".join(["?"] * len(eids_with_old_cf))
                conn.execute(
                    f"DELETE FROM emoney_tx WHERE note LIKE 'archive_carry_forward%' AND emoney_id IN ({marks})",
                    tuple(eids_with_old_cf),
                )

            cf_count = 0
            for eid, total in combined.items():
                if total == 0:
                    continue
                ttype = "topup" if total > 0 else "expense"
                amount = total if total > 0 else (-total)
                conn.execute(
                    "INSERT INTO emoney_tx (emoney_id, type, amount_cents, note, ref_container_id, created_at) VALUES (?, ?, ?, ?, NULL, ?)",
                    (eid, ttype, amount, f"archive_carry_forward {res['batch_id']}", _iso_end(end)),
                )
                cf_count += 1
            res["cf_inserted"] = cf_count

            # Delete removed tx (window)
            if tx_ids:
                marks = ",".join(["?"] * len(tx_ids))
                conn.execute(f"DELETE FROM emoney_tx WHERE id IN ({marks})", tuple(tx_ids))
                res["deleted"]["emoney_tx_removed"] = len(tx_ids)

        # If containers included, delete their history and the containers
        if include_containers and selected:
            marks = ",".join(["?"] * len(selected))
            # Delete children first
            cur = conn.execute(f"SELECT COUNT(*) c FROM container_item WHERE container_id IN ({marks})", tuple(selected)).fetchone()
            res["deleted"]["container_items"] = int(cur["c"] or 0)
            conn.execute(f"DELETE FROM container_item WHERE container_id IN ({marks})", tuple(selected))
            cur = conn.execute(f"SELECT COUNT(*) c FROM dn_snapshots WHERE container_id IN ({marks})", tuple(selected)).fetchone()
            res["deleted"]["dn_snapshots"] = int(cur["c"] or 0)
            conn.execute(f"DELETE FROM dn_snapshots WHERE container_id IN ({marks})", tuple(selected))

            # Optional: unlink any remaining emoney tx referencing these containers (if not already removed)
            if not include_emoney:
                conn.execute(f"UPDATE emoney_tx SET ref_container_id=NULL WHERE ref_container_id IN ({marks})", tuple(selected))

            # Delete containers
            cur = conn.execute(f"SELECT COUNT(*) c FROM containers WHERE id IN ({marks})", tuple(selected)).fetchone()
            res["deleted"]["containers"] = int(cur["c"] or 0)
            conn.execute(f"DELETE FROM containers WHERE id IN ({marks})", tuple(selected))

        # Persist batch manifest for Archive Browser
        try:
            snap_dir = _ensure_snapshots_dir()
            ts2 = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            nowdt = datetime.datetime.now()
            man = {
                "id": res["batch_id"],
                "start": S, "end": E,
                "scopes": {
                    "include_containers": include_containers,
                    "include_emoney": include_emoney,
                    "emoney_scope": sorted(list(scope)),
                },
                "selected_containers": selected,
                "deleted": res["deleted"],
                "cf_inserted": res["cf_inserted"],
                "snapshot": res["snapshot"],
                "created_at": now_iso(),
                "created_at_fmt": _fmt_id_time(nowdt),
                "id_display": f"Batch { _fmt_id_time(nowdt) }",
            }
            with open(os.path.join(snap_dir, f"cleanup_batch_{ts2}.json"), "w", encoding="utf-8") as f:
                json.dump(man, f)
        except Exception:
            pass

        conn.commit()
        return ok(res)
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        conn.close()


@bp.get("/cleanup/batches")
@auth_required
def cleanup_batches():
    snap_dir = _ensure_snapshots_dir()
    items = []
    try:
        for name in os.listdir(snap_dir):
            if not name.startswith("cleanup_batch_") or not name.endswith(".json"):
                continue
            data = _load_json_safe(os.path.join(snap_dir, name))
            if data:
                items.append({
                    "id": data.get("id"),
                    "id_display": data.get("id_display"),
                    "start": data.get("start"),
                    "end": data.get("end"),
                    "scopes": data.get("scopes"),
                    "created_at": data.get("created_at"),
                    "created_at_fmt": data.get("created_at_fmt"),
                })
        items.sort(key=lambda x: (x.get("created_at") or ""), reverse=True)
    except Exception:
        items = []
    return ok({"batches": items})


@bp.get("/cleanup/batches/<bid>")
@auth_required
def cleanup_batch_detail(bid):
    snap_dir = _ensure_snapshots_dir()
    try:
        for name in os.listdir(snap_dir):
            if not name.startswith("cleanup_batch_") or not name.endswith(".json"):
                continue
            path = os.path.join(snap_dir, name)
            data = _load_json_safe(path)
            if data and str(data.get("id")) == str(bid):
                return ok(data)
    except Exception:
        pass
    return ok({"id": bid, "message": "not found"}, status=404)


# --------- SNAPSHOTS (EXPORT / FULL RESTORE) ---------
@bp.post("/cleanup/snapshots/create")
@auth_required
def snapshot_create():
    data = request.get_json(silent=True) or {}
    snap = _make_snapshot(data.get("note"))
    return ok({"id": snap["id"], "file": snap["file"], "note": data.get("note")})


@bp.get("/cleanup/snapshots")
@auth_required
def snapshot_list():
    snap_dir = _ensure_snapshots_dir()
    raw = []
    try:
        for name in os.listdir(snap_dir):
            if not name.startswith("snapshot_") or not name.endswith(".json"):
                continue
            data = _load_json_safe(os.path.join(snap_dir, name))
            if data:
                # parse created_at
                ca = data.get("created_at") or ""
                try:
                    dt = datetime.datetime.fromisoformat(ca.replace("Z", ""))
                except Exception:
                    dt = None
                raw.append({
                    "id": data.get("id"),
                    "id_display": data.get("id_display"),
                    "created_at": ca,
                    "created_at_fmt": data.get("created_at_fmt"),
                    "note": data.get("note"),
                    "_dt": dt,
                })
        # assign sequence ascending by time
        asc = sorted(raw, key=lambda x: (x["_dt"] or datetime.datetime.min))
        seq_map = {it["id"]: (i+1) for i, it in enumerate(asc)}
        for it in raw:
            it["seq"] = seq_map.get(it["id"]) or None
        items = sorted(raw, key=lambda x: (x.get("created_at") or ""), reverse=True)
    except Exception:
        items = []
    return ok({"snapshots": items})


@bp.post("/cleanup/snapshots/<sid>/restore")
@auth_required
def snapshot_restore(sid):
    # Perform full restore by overwriting DB with the chosen snapshot file
    snap_dir = _ensure_snapshots_dir()
    # find manifest by id
    manifest = None
    try:
        for name in os.listdir(snap_dir):
            if not name.startswith("snapshot_") or not name.endswith(".json"):
                continue
            data = _load_json_safe(os.path.join(snap_dir, name))
            if data and str(data.get("id")) == str(sid):
                manifest = data
                break
    except Exception:
        manifest = None
    if not manifest:
        return jsonify({"error": True, "message": "Snapshot tidak ditemukan"}), 404

    db_file = manifest.get("db_file")
    if not db_file:
        return jsonify({"error": True, "message": "File snapshot tidak valid"}), 400
    src = os.path.join(snap_dir, db_file)
    if not os.path.exists(src):
        return jsonify({"error": True, "message": "File snapshot hilang"}), 404

    # Backup current DB
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"pre_restore_{ts}.sqlite3"
    backup_path = os.path.join(snap_dir, backup_name)
    try:
        shutil.copy2(DB_PATH, backup_path)
    except Exception as e:
        return jsonify({"error": True, "message": f"Gagal backup current DB: {e}"}), 500

    # Overwrite current DB with snapshot
    try:
        shutil.copy2(src, DB_PATH)
    except Exception as e:
        return jsonify({"error": True, "message": f"Gagal restore: {e}"}), 500

    return ok({
        "restored": sid,
        "using_file": db_file,
        "backup": backup_name,
        "note": "DB telah di-restore. Disarankan restart backend agar koneksi SQLite segar."
    })


# --------- ARCHIVE BROWSER (READ-ONLY) ---------
@bp.get("/archive/batches")
@auth_required
def archive_batches():
    # Alias to cleanup batches
    return cleanup_batches()


@bp.get("/archive/batches/<bid>")
@auth_required
def archive_batch_detail(bid):
    # Alias to cleanup batch detail
    return cleanup_batch_detail(bid)


@bp.get("/archive/containers")
@auth_required
def archive_containers():
    # Expect start, end, limit, offset
    return ok({"items": [], "total": 0, "limit": 0, "offset": 0})


@bp.get("/archive/containers/<cid>")
@auth_required
def archive_container_detail(cid):
    return ok({"id": cid, "children": {}})


@bp.get("/archive/emoney/tx")
@auth_required
def archive_emoney_tx():
    # Expect account id or filters
    return ok({"items": [], "total": 0, "limit": 0, "offset": 0})
