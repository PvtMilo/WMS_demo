# WMS Demo

## Overview
Warehouse Management System demo application with a Flask backend and React frontend. The backend uses a single SQLite file (`backend/wms.sqlite3`) and initializes its schema at runtime.

## Backend Setup
- `cd backend`
- (optional) `python -m venv venv`
- `pip install -r requirements.txt`
- `python app.py`

## Database Schema Upgrades
New features often introduce additional tables or columns. Keep the database compatible with existing installations by extending `db.init_db()` instead of shipping a fresh database.

### When adding a new table or column
1. Update `backend/db.py:init_db()` with `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN` statements. These must be idempotent so they can run repeatedly without wiping data.
2. Include any data backfill (e.g., set defaults) right after the `ALTER TABLE` statements.
3. Commit both your feature code and the `init_db()` changes together.

### Migrating an existing database
1. Back up the current file: `copy backend\wms.sqlite3 backend\wms.sqlite3.bak` (Windows) or `cp backend/wms.sqlite3 backend/wms.sqlite3.bak` (macOS/Linux).
2. From the `backend` directory run:
   `python -c "from db import init_db; init_db()"`
3. Restart the Flask app so every new connection sees the updated schema.

### Verify the upgrade
- List tables: `python -c "import sqlite3; conn=sqlite3.connect('wms.sqlite3'); cur=conn.cursor(); cur.execute('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name'); print([r[0] for r in cur.fetchall()])"`
- Check for duplicate active container items (required for the unique index):
  `python -c "import sqlite3; conn=sqlite3.connect('wms.sqlite3'); cur=conn.cursor(); cur.execute('SELECT container_id, id_code, COUNT(*) FROM container_item WHERE voided_at IS NULL GROUP BY container_id, id_code HAVING COUNT(*)>1'); print(cur.fetchall())"`

If `init_db()` fails (e.g., because the unique index detects duplicates), fix the data issue first, then rerun the command.
