import sqlite3, os, datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "wms.sqlite3")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    # tabel unit barang
    cur.execute("""
    CREATE TABLE IF NOT EXISTS item_unit (
        id_code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        model TEXT NOT NULL,
        rack TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Good',           -- Good | Keluar | Rusak | Hilang | Afkir
        defect_level TEXT DEFAULT 'none',              -- none | ringan | berat
        serial TEXT,
        created_at TEXT NOT NULL
    );
    """)
    conn.commit()
    conn.close()

def now_iso():
    return datetime.datetime.now().isoformat(timespec="seconds")