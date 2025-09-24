from flask import Blueprint, request, jsonify
from routes_auth import auth_required, require_roles
from db import get_conn, now_iso

bp = Blueprint('stock', __name__, url_prefix='/stock')


def _normalize(text: str) -> str:
    return (text or '').strip()


def _parse_qty(value, *, allow_zero: bool = False):
    try:
        qty = int(value)
    except (TypeError, ValueError):
        return None
    if allow_zero:
        return qty if qty >= 0 else None
    return qty if qty > 0 else None


@bp.get('')
@auth_required
def list_stock():
    q = _normalize(request.args.get('q'))
    like = f"%{q.lower()}%" if q else None
    conn = get_conn()
    try:
        if like:
            rows = conn.execute(
                '''
                SELECT id, name, category, qty, created_at, updated_at
                FROM stock_item
                WHERE LOWER(name) LIKE ? OR LOWER(category) LIKE ?
                ORDER BY LOWER(name), LOWER(category)
                ''',
                (like, like),
            ).fetchall()
        else:
            rows = conn.execute(
                '''
                SELECT id, name, category, qty, created_at, updated_at
                FROM stock_item
                ORDER BY LOWER(name), LOWER(category)
                '''
            ).fetchall()
        data = [dict(r) for r in rows]
        total_qty = sum(int(item.get('qty') or 0) for item in data)
        return jsonify({'data': data, 'total_count': len(data), 'total_qty': total_qty})
    finally:
        conn.close()


@bp.get('/summary_by_category')
@auth_required
def summary_by_category():
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT category, SUM(qty) AS total_qty, COUNT(*) AS item_types
            FROM stock_item
            GROUP BY category
            ORDER BY total_qty DESC, LOWER(category)
            """
        ).fetchall()
        data = []
        total_qty = 0
        for row in rows:
            qty = int(row['total_qty'] or 0)
            total_qty += qty
            data.append({
                'category': row['category'],
                'total': qty,
                'item_count': int(row['item_types'] or 0),
            })
        return jsonify({
            'data': data,
            'total_categories': len(data),
            'total_qty': total_qty,
        })
    finally:
        conn.close()

@bp.post('')
@auth_required
@require_roles('admin', 'pic', 'operator')
def create_stock():
    body = request.get_json(silent=True) or {}
    name = _normalize(body.get('name'))
    category = _normalize(body.get('category'))
    qty = _parse_qty(body.get('qty'))
    if not name or not category or qty is None:
        return jsonify({'error': True, 'message': 'Nama, kategori, dan qty (>0) wajib diisi'}), 400

    conn = get_conn()
    now = now_iso()
    try:
        cur = conn.execute(
            'SELECT id, qty FROM stock_item WHERE name=? AND category=?',
            (name, category),
        )
        row = cur.fetchone()
        if row:
            new_qty = int(row['qty'] or 0) + qty
            conn.execute(
                'UPDATE stock_item SET qty=?, updated_at=? WHERE id=?',
                (new_qty, now, row['id']),
            )
            conn.commit()
            return jsonify({'ok': True, 'id': row['id'], 'qty': new_qty, 'restocked': True})

        cur = conn.execute(
            'INSERT INTO stock_item (name, category, qty, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            (name, category, qty, now, now),
        )
        conn.commit()
        return jsonify({'ok': True, 'id': cur.lastrowid, 'qty': qty, 'restocked': False}), 201
    finally:
        conn.close()


@bp.post('/<int:item_id>/restock')
@auth_required
@require_roles('admin', 'pic', 'operator')
def restock_item(item_id: int):
    body = request.get_json(silent=True) or {}
    qty = _parse_qty(body.get('qty'))
    if qty is None:
        return jsonify({'error': True, 'message': 'Qty (>0) wajib'}), 400

    conn = get_conn()
    now = now_iso()
    try:
        cur = conn.execute('SELECT qty FROM stock_item WHERE id=?', (item_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': True, 'message': 'Stock tidak ditemukan'}), 404
        new_qty = int(row['qty'] or 0) + qty
        conn.execute(
            'UPDATE stock_item SET qty=?, updated_at=? WHERE id=?',
            (new_qty, now, item_id),
        )
        conn.commit()
        return jsonify({'ok': True, 'id': item_id, 'qty': new_qty})
    finally:
        conn.close()


@bp.put('/<int:item_id>')
@auth_required
@require_roles('admin', 'pic', 'operator')
def update_item(item_id: int):
    body = request.get_json(silent=True) or {}
    name = _normalize(body.get('name'))
    category = _normalize(body.get('category'))
    qty = _parse_qty(body.get('qty'), allow_zero=True)
    if qty is None:
        return jsonify({'error': True, 'message': 'Qty >= 0 wajib'}), 400

    conn = get_conn()
    now = now_iso()
    try:
        row = conn.execute('SELECT name, category, qty FROM stock_item WHERE id=?', (item_id,)).fetchone()
        if not row:
            return jsonify({'error': True, 'message': 'Stock tidak ditemukan'}), 404

        new_name = name if name else row['name']
        new_category = category if category else row['category']
        if not new_name or not new_category:
            return jsonify({'error': True, 'message': 'Nama dan kategori tidak boleh kosong'}), 400

        rename = (new_name != row['name']) or (new_category != row['category'])
        if rename:
            dup = conn.execute(
                'SELECT id FROM stock_item WHERE name=? AND category=? AND id!=?',
                (new_name, new_category, item_id),
            ).fetchone()
            if dup:
                return jsonify({'error': True, 'message': 'Nama + kategori sudah terpakai'}), 409

        conn.execute(
            'UPDATE stock_item SET name=?, category=?, qty=?, updated_at=? WHERE id=?',
            (new_name, new_category, qty, now, item_id),
        )
        conn.commit()
        return jsonify({'ok': True, 'id': item_id, 'qty': qty, 'name': new_name, 'category': new_category})
    finally:
        conn.close()

@bp.delete('/<int:item_id>')
@auth_required
@require_roles('admin', 'pic', 'operator')
def delete_item(item_id: int):
    conn = get_conn()
    try:
        row = conn.execute('SELECT id FROM stock_item WHERE id=?', (item_id,)).fetchone()
        if not row:
            return jsonify({'error': True, 'message': 'Stock tidak ditemukan'}), 404
        conn.execute('DELETE FROM stock_item WHERE id=?', (item_id,))
        conn.commit()
        return jsonify({'ok': True, 'id': item_id})
    finally:
        conn.close()

@bp.post('/bulk_delete')
@auth_required
@require_roles('admin', 'pic', 'operator')
def bulk_delete():
    body = request.get_json(silent=True) or {}
    ids_raw = body.get('ids')
    if not isinstance(ids_raw, list) or not ids_raw:
        return jsonify({'error': True, 'message': 'ids (list) wajib'}), 400

    ids = []
    for val in ids_raw:
        try:
            num = int(val)
        except (TypeError, ValueError):
            continue
        if num > 0:
            ids.append(num)

    if not ids:
        return jsonify({'error': True, 'message': 'Tidak ada id valid'}), 400

    ids = sorted(set(ids))
    placeholders = ','.join(['?'] * len(ids))

    conn = get_conn()
    try:
        rows = conn.execute(f'SELECT id FROM stock_item WHERE id IN ({placeholders})', ids).fetchall()
        found = [row['id'] for row in rows]
        if not found:
            return jsonify({'ok': True, 'requested': len(ids), 'deleted': 0})
        conn.execute(f'DELETE FROM stock_item WHERE id IN ({placeholders})', ids)
        conn.commit()
        return jsonify({'ok': True, 'requested': len(ids), 'deleted': len(found)})
    finally:
        conn.close()
