# backend/db.py
import sqlite3, os, datetime, json

DB_PATH = os.path.join(os.path.dirname(__file__), "wms.sqlite3")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def now_iso():
    return datetime.datetime.now().isoformat(timespec="seconds")

def new_container_id():
    today = datetime.datetime.now().strftime("%Y%m%d")
    # 4-char pseudo-random
    import uuid
    short = uuid.uuid4().hex[:4].upper()
    return f"CTR-{today}-{short}"

def new_emoney_id():
    today = datetime.datetime.now().strftime("%Y%m%d")
    import uuid
    short = uuid.uuid4().hex[:4].upper()
    return f"EM-{today}-{short}"

def _column_exists(cur, table, name):
    cols = cur.execute(f"PRAGMA table_info({table})").fetchall()
    return any(c[1] == name for c in cols)

def init_db():
    conn = get_conn()
    cur = conn.cursor()

    # ==== Items (existing) ====
    cur.execute("""
    CREATE TABLE IF NOT EXISTS item_unit (
        id_code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        model TEXT NOT NULL,
        rack TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Good',     -- Good | Keluar | Rusak | Hilang | Afkir
        defect_level TEXT DEFAULT 'none',        -- none | ringan | berat
        serial TEXT,
        created_at TEXT NOT NULL,
        is_universal INTEGER NOT NULL DEFAULT 0  -- 1 jika universal (tidak mengunci saat checkout)
    );
    """)

    # ==== Containers (new) ====
    cur.execute("""
    CREATE TABLE IF NOT EXISTS containers (
        id TEXT PRIMARY KEY,                     -- CTR-YYYYMMDD-XXXX
        event_name TEXT NOT NULL,
        pic TEXT NOT NULL,
        crew TEXT,
        location TEXT,
        start_date TEXT,
        end_date TEXT,
        order_title TEXT,                        -- optional: Order label/title for DN
        status TEXT NOT NULL DEFAULT 'Open',     -- Open | Closed
        created_at TEXT NOT NULL
    );
    """)

    # Backfill missing columns for older DBs
    if not _column_exists(cur, "containers", "order_title"):
        cur.execute("ALTER TABLE containers ADD COLUMN order_title TEXT;")

    # ==== Container items (new) ====
    cur.execute("""
    CREATE TABLE IF NOT EXISTS container_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        container_id TEXT NOT NULL,
        id_code TEXT NOT NULL,
        added_at TEXT NOT NULL,
        batch_label TEXT NOT NULL,               -- MAIN | AMEND-YYYYMMDD-HHMM
        condition_at_checkout TEXT,              -- good | rusak_ringan | rusak_berat
        override_reason TEXT,                    -- alasan jika rusak_berat
        amend_reason TEXT,                       -- alasan jika batch AMEND
        override_by TEXT,                        -- (opsional) siapa yang setujui
        voided_at TEXT,                          -- jika dibatalkan (mis-scan)
        void_reason TEXT,                        -- alasan void
        returned_at TEXT,                        -- waktu kembali
        return_condition TEXT,                   -- good | rusak_ringan | rusak_berat
        damage_note TEXT,                        -- catatan kerusakan saat kembali
        FOREIGN KEY(container_id) REFERENCES containers(id),
        FOREIGN KEY(id_code) REFERENCES item_unit(id_code)
    );
    """)

    # Tambahkan kolom jika DB lama
    need_cols = {
        "container_item": [
            ("condition_at_checkout", "TEXT"),
            ("override_reason", "TEXT"),
            ("amend_reason", "TEXT"),
            ("override_by", "TEXT"),
            ("voided_at", "TEXT"),
            ("void_reason", "TEXT"),
            ("returned_at", "TEXT"),
            ("return_condition", "TEXT"),
            ("damage_note", "TEXT"),
        ]
    }
    for table, cols in need_cols.items():
        for name, ddl in cols:
            if not _column_exists(cur, table, name):
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl};")

    # Unique index: 1 item aktif hanya sekali per kontainer (abaikan yang sudah void)
    cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS uq_container_item_active
    ON container_item(container_id, id_code)
    WHERE voided_at IS NULL;
    """)

    # ==== DN Snapshots ====
    cur.execute("""
    CREATE TABLE IF NOT EXISTS dn_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        container_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        payload TEXT NOT NULL,                   -- JSON (header, items per batch, counters)
        created_at TEXT NOT NULL,
        created_by TEXT
    );
    """)
    cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_dn_snapshots_container
    ON dn_snapshots(container_id, version);
    """)
    
    # Tambahkan kolom untuk DB lama (backward compatible)
    if not _column_exists(cur, "item_unit", "is_universal"):
        cur.execute("ALTER TABLE item_unit ADD COLUMN is_universal INTEGER NOT NULL DEFAULT 0;")

    # ==== Index untuk performa list & summary ====
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_created_at ON item_unit(created_at);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_category   ON item_unit(category);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_status     ON item_unit(status);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_model      ON item_unit(model);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_rack       ON item_unit(rack);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_name       ON item_unit(name);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_item_universal  ON item_unit(is_universal);")

    # ==== Maintenance / Repair logs ====
    cur.execute("""
    CREATE TABLE IF NOT EXISTS item_repair_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_code TEXT NOT NULL,
        defect_before TEXT,            -- none | ringan | berat
        status_before TEXT,            -- Good | Rusak | Keluar | ...
        last_damage_note TEXT,         -- catatan kerusakan terakhir (dari container_item)
        repair_note TEXT NOT NULL,     -- catatan penanganan (wajib dari PIC)
        result_status TEXT,            -- Good | Rusak | Afkir (Broken)
        result_defect TEXT,            -- none | ringan | berat
        repaired_at TEXT NOT NULL,     -- timestamp perbaikan
        FOREIGN KEY(id_code) REFERENCES item_unit(id_code)
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_repair_code ON item_repair_log(id_code, repaired_at);")

    # add columns for existing DBs
    for name, ddl in (("result_status", "TEXT"), ("result_defect", "TEXT")):
        if not _column_exists(cur, "item_repair_log", name):
            cur.execute(f"ALTER TABLE item_repair_log ADD COLUMN {name} {ddl};")

    # ==== E-Money tracking ====
    cur.execute("""
    CREATE TABLE IF NOT EXISTS emoney (
        id TEXT PRIMARY KEY,                -- EM-YYYYMMDD-XXXX
        label TEXT NOT NULL UNIQUE,         -- e.g., Emoney 001 CI
        status TEXT NOT NULL DEFAULT 'Open',-- Open | Closed
        created_at TEXT NOT NULL
    );
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS emoney_tx (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emoney_id TEXT NOT NULL,
        type TEXT NOT NULL,                 -- topup | expense
        amount_cents INTEGER NOT NULL,      -- positive integer (in cents)
        note TEXT,
        ref_container_id TEXT,              -- optional link to containers.id
        created_at TEXT NOT NULL,
        FOREIGN KEY(emoney_id) REFERENCES emoney(id),
        FOREIGN KEY(ref_container_id) REFERENCES containers(id)
    );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_emoney_label ON emoney(label);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_emoney_tx_eid ON emoney_tx(emoney_id, created_at);")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_emoney_tx_container ON emoney_tx(ref_container_id);")

    conn.commit()
    conn.close()
