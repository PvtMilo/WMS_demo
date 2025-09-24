from flask import Blueprint, request, jsonify, send_file
from routes_auth import auth_required
from db import get_conn, now_iso
from datetime import datetime
import io
import xlsxwriter

bp = Blueprint('usage_reports', __name__, url_prefix='/usage_reports')


STATUS_PENDING = 'pending'
STATUS_DONE = 'done'


def _parse_date(s: str):
    s = (s or '').strip()
    if not s:
        return None
    for fmt in ('%Y-%m-%d', '%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M', '%d-%m-%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _normalize_status(value: str):
    v = (value or '').strip().lower()
    if v in ('done', 'completed'):
        return STATUS_DONE
    if v in ('pending', 'needed', 'report needed', 'report_needed'):
        return STATUS_PENDING
    return None


def _load_usage_reports(conn, start_date=None, end_date=None, status_filter=None, q=None, limit=None):
    base_rows = conn.execute(
        """
        SELECT c.id, c.event_name, c.pic, c.crew, c.location,
               c.start_date, c.end_date, c.order_title, c.status,
               c.usage_report_status,
               ur.id AS report_id, ur.vehicle, ur.special_note, ur.submitted_by,
               ur.created_at AS report_created_at, ur.updated_at AS report_updated_at
        FROM containers c
        LEFT JOIN container_usage_report ur ON ur.container_id = c.id
        ORDER BY c.start_date DESC, c.created_at DESC
        """
    ).fetchall()

    query = (q or '').strip().lower()
    out = []
    ids = []
    for row in base_rows:
        start = _parse_date(row['start_date'])
        if start_date and start and start < start_date:
            continue
        if end_date and start and start > end_date:
            continue
        norm_status = (row['usage_report_status'] or '').lower() or STATUS_PENDING
        if status_filter and norm_status != status_filter:
            continue
        if query:
            haystack = ' '.join([
                row['id'] or '',
                row['event_name'] or '',
                row['order_title'] or '',
                row['location'] or '',
                row['pic'] or '',
                row['crew'] or '',
                (row['vehicle'] or '') if row['report_id'] else ''
            ]).lower()
            if query not in haystack:
                continue
        rec = {
            'container_id': row['id'],
            'event_name': row['event_name'],
            'start_date': row['start_date'],
            'end_date': row['end_date'],
            'order_title': row['order_title'],
            'location': row['location'],
            'pic': row['pic'],
            'crew': row['crew'],
            'usage_report_status': norm_status,
            'vehicle': row['vehicle'],
            'special_note': row['special_note'],
            'submitted_by': row['submitted_by'],
            'report_created_at': row['report_created_at'],
            'report_updated_at': row['report_updated_at'],
        }
        out.append(rec)
        if row['report_id']:
            ids.append(row['report_id'])
        if limit and len(out) >= limit:
            break

    container_ids = list(dict.fromkeys(rec['container_id'] for rec in out if rec['container_id']))
    items_map = {}
    if container_ids:
        placeholders = ','.join(['?'] * len(container_ids))
        item_rows = conn.execute(
            f"""
            SELECT ur.container_id, ui.stock_name, ui.stock_category, ui.qty_used, ui.qty_after, ui.note
            FROM container_usage_report ur
            JOIN container_usage_item ui ON ui.report_id = ur.id
            WHERE ur.container_id IN ({placeholders})
            ORDER BY ur.container_id, ui.id
            """,
            container_ids,
        ).fetchall()
        for it in item_rows:
            items_map.setdefault(it['container_id'], []).append({
                'stock_name': it['stock_name'],
                'stock_category': it['stock_category'],
                'qty_used': int(it['qty_used'] or 0),
                'qty_after': int(it['qty_after'] or 0),
                'note': it['note'],
            })

    for rec in out:
        rec['items'] = items_map.get(rec['container_id'], [])
        rec['has_report'] = rec['usage_report_status'] == STATUS_DONE or bool(rec['items'])
    return out


@bp.get('')
@auth_required
def list_usage_reports():
    start = _parse_date(request.args.get('start'))
    end = _parse_date(request.args.get('end'))
    status = _normalize_status(request.args.get('status'))
    q = request.args.get('q')
    conn = get_conn()
    try:
        data = _load_usage_reports(conn, start, end, status, q)
        return jsonify({'data': data, 'total': len(data)})
    finally:
        conn.close()


@bp.get('/<cid>')
@auth_required
def get_usage_report(cid):
    cid = (cid or '').strip()
    if not cid:
        return jsonify({'error': True, 'message': 'cid wajib'}), 400
    conn = get_conn()
    try:
        container = conn.execute(
            """
            SELECT id, event_name, pic, crew, location, start_date, end_date, order_title, status, usage_report_status
            FROM containers
            WHERE id=?
            """,
            (cid,),
        ).fetchone()
        if not container:
            return jsonify({'error': True, 'message': 'Container tidak ditemukan'}), 404

        report = conn.execute(
            """
            SELECT id, vehicle, special_note, submitted_by, created_at, updated_at
            FROM container_usage_report
            WHERE container_id=?
            """,
            (cid,),
        ).fetchone()
        report_id = report['id'] if report else None
        items = []
        if report_id:
            rows = conn.execute(
                """
                SELECT id, stock_id, stock_name, stock_category, qty_before, qty_used, qty_after, note
                FROM container_usage_item
                WHERE report_id=?
                ORDER BY id ASC
                """,
                (report_id,),
            ).fetchall()
            for row in rows:
                items.append({
                    'id': row['id'],
                    'stock_id': row['stock_id'],
                    'stock_name': row['stock_name'],
                    'stock_category': row['stock_category'],
                    'qty_before': int(row['qty_before'] or 0),
                    'qty_used': int(row['qty_used'] or 0),
                    'qty_after': int(row['qty_after'] or 0),
                    'note': row['note'],
                })

        stock_rows = conn.execute(
            """
            SELECT id, name, category, qty
            FROM stock_item
            ORDER BY LOWER(name), LOWER(category)
            """
        ).fetchall()
        stock_options = [{
            'id': row['id'],
            'name': row['name'],
            'category': row['category'],
            'qty': int(row['qty'] or 0),
        } for row in stock_rows]

        data = {
            'container': dict(container),
            'report': dict(report) if report else None,
            'items': items,
            'stock_options': stock_options,
        }
        return jsonify(data)
    finally:
        conn.close()


@bp.post('/<cid>')
@auth_required
def save_usage_report(cid):
    cid = (cid or '').strip()
    if not cid:
        return jsonify({'error': True, 'message': 'cid wajib'}), 400

    body = request.get_json(silent=True) or {}
    items = body.get('items') or []
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({'error': True, 'message': 'Minimal satu item pemakaian'}), 400

    vehicle = (body.get('vehicle') or '').strip()
    special_note = (body.get('special_note') or '').strip()
    submitted_by = str((getattr(request, 'user', {}) or {}).get('id') or (getattr(request, 'user', {}) or {}).get('email') or '')
    now = now_iso()

    conn = get_conn()
    try:
        conn.execute('BEGIN')
        container = conn.execute(
            "SELECT id, usage_report_status FROM containers WHERE id=?",
            (cid,)
        ).fetchone()
        if not container:
            conn.execute('ROLLBACK')
            return jsonify({'error': True, 'message': 'Container tidak ditemukan'}), 404

        report = conn.execute(
            "SELECT id FROM container_usage_report WHERE container_id=?",
            (cid,)
        ).fetchone()
        report_id = report['id'] if report else None

        if report_id:
            prev_items = conn.execute(
                "SELECT stock_id, qty_used FROM container_usage_item WHERE report_id=?",
                (report_id,)
            ).fetchall()
            for prev in prev_items:
                conn.execute(
                    "UPDATE stock_item SET qty = qty + ? WHERE id=?",
                    (int(prev['qty_used'] or 0), prev['stock_id'])
                )
            conn.execute("DELETE FROM container_usage_item WHERE report_id=?", (report_id,))

        prepared_items = []
        for entry in items:
            stock_id = entry.get('stock_id')
            qty_used = entry.get('qty')
            note = (entry.get('note') or '').strip()
            try:
                stock_id = int(stock_id)
            except (TypeError, ValueError):
                conn.execute('ROLLBACK')
                return jsonify({'error': True, 'message': 'stock_id harus angka'}), 400
            try:
                qty_used = int(qty_used)
            except (TypeError, ValueError):
                conn.execute('ROLLBACK')
                return jsonify({'error': True, 'message': 'Qty pemakaian harus angka'}), 400
            if qty_used <= 0:
                conn.execute('ROLLBACK')
                return jsonify({'error': True, 'message': 'Qty pemakaian harus > 0'}), 400

            stock_row = conn.execute(
                "SELECT id, name, category, qty FROM stock_item WHERE id=?",
                (stock_id,),
            ).fetchone()
            if not stock_row:
                conn.execute('ROLLBACK')
                return jsonify({'error': True, 'message': 'Item stock tidak ditemukan'}), 404

            qty_before = int(stock_row['qty'] or 0)
            qty_after = qty_before - qty_used
            if qty_after < 0:
                conn.execute('ROLLBACK')
                return jsonify({'error': True, 'message': f"Qty stok untuk {stock_row['name']} tidak mencukupi"}), 400

            prepared_items.append({
                'stock_id': stock_id,
                'stock_name': stock_row['name'],
                'stock_category': stock_row['category'],
                'qty_before': qty_before,
                'qty_used': qty_used,
                'qty_after': qty_after,
                'note': note,
            })

        if report_id:
            conn.execute(
                """
                UPDATE container_usage_report
                SET vehicle=?, special_note=?, submitted_by=?, updated_at=?
                WHERE id=?
                """,
                (vehicle, special_note, submitted_by, now, report_id)
            )
        else:
            cur = conn.execute(
                """
                INSERT INTO container_usage_report (container_id, vehicle, special_note, submitted_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (cid, vehicle, special_note, submitted_by, now, now)
            )
            report_id = cur.lastrowid

        for item in prepared_items:
            conn.execute(
                """
                INSERT INTO container_usage_item (report_id, stock_id, stock_name, stock_category, qty_before, qty_used, qty_after, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    item['stock_id'],
                    item['stock_name'],
                    item['stock_category'],
                    item['qty_before'],
                    item['qty_used'],
                    item['qty_after'],
                    item['note'],
                )
            )
            conn.execute(
                "UPDATE stock_item SET qty=? WHERE id=?",
                (item['qty_after'], item['stock_id'])
            )

        conn.execute(
            "UPDATE containers SET usage_report_status=? WHERE id=?",
            (STATUS_DONE, cid)
        )

        conn.commit()
        return jsonify({'ok': True, 'usage_report_status': STATUS_DONE})
    except Exception as exc:
        conn.rollback()
        return jsonify({'error': True, 'message': str(exc)}), 400
    finally:
        conn.close()


def _item_column_key(name, category):
    raw_name = (name or '').strip().lower()
    raw_cat = (category or '').strip().lower()
    return f"{raw_name}||{raw_cat}"


def _format_pic(pic, crew):
    if pic and crew:
        return f"{pic} / {crew}"
    return pic or crew or ''


@bp.get('/export')
@auth_required
def export_usage_reports():
    start = _parse_date(request.args.get('start'))
    end = _parse_date(request.args.get('end'))
    status = _normalize_status(request.args.get('status'))
    q = request.args.get('q')
    conn = get_conn()
    try:
        data = _load_usage_reports(conn, start, end, status, q)

        column_map = {}
        for row in data:
            items = row.get('items') or []
            for item in items:
                key = _item_column_key(item.get('stock_name'), item.get('stock_category'))
                if key not in column_map:
                    label_base = (item.get('stock_name') or '').strip() or '(Tanpa nama)'
                    label = f"{label_base} ({item.get('stock_category')})" if item.get('stock_category') else label_base
                    column_map[key] = {'key': key, 'label': label}
        item_columns = sorted(column_map.values(), key=lambda c: c['label'].lower())

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        sheet = workbook.add_worksheet('Report Pemakaian')

        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#1f2937', 'font_color': 'white', 'border': 1, 'align': 'center'})
        cell_fmt = workbook.add_format({'border': 1, 'valign': 'top'})
        date_fmt = workbook.add_format({'border': 1, 'num_format': 'yyyy-mm-dd'})
        wrap_fmt = workbook.add_format({'border': 1, 'valign': 'top', 'text_wrap': True})

        headers = [
            'Tanggal Event',
            'Job/Order',
            'Nama Event',
            'Lokasi Event',
            'PIC/Crew',
            'Kendaraan',
        ] + [col['label'] for col in item_columns] + [
            'Catatan Khusus',
            'Status',
            'Tanggal Submit'
        ]

        for col, title in enumerate(headers):
            sheet.write(0, col, title, header_fmt)

        base_widths = [14, 18, 24, 18, 18, 16]
        dynamic_widths = [max(12, min(32, len(col['label']) + 4)) for col in item_columns]
        tail_widths = [24, 14, 18]
        col_widths = base_widths + dynamic_widths + tail_widths
        for idx, width in enumerate(col_widths):
            sheet.set_column(idx, idx, width)

        row_idx = 1
        for row in data:
            event_date = _parse_date(row.get('start_date'))
            if event_date:
                sheet.write_datetime(row_idx, 0, datetime.combine(event_date, datetime.min.time()), date_fmt)
            else:
                sheet.write(row_idx, 0, row.get('start_date') or '', cell_fmt)
            sheet.write(row_idx, 1, row.get('order_title') or '', cell_fmt)
            sheet.write(row_idx, 2, row.get('event_name') or '', cell_fmt)
            sheet.write(row_idx, 3, row.get('location') or '', cell_fmt)
            sheet.write(row_idx, 4, _format_pic(row.get('pic'), row.get('crew')), cell_fmt)
            sheet.write(row_idx, 5, row.get('vehicle') or '', cell_fmt)

            usage_map = {}
            for item in row.get('items') or []:
                key = _item_column_key(item.get('stock_name'), item.get('stock_category'))
                qty = int(item.get('qty_used') or 0)
                usage_map[key] = usage_map.get(key, 0) + qty

            col_idx = 6
            for col in item_columns:
                value = usage_map.get(col['key'])
                if value:
                    sheet.write_number(row_idx, col_idx, value, cell_fmt)
                else:
                    sheet.write(row_idx, col_idx, '', cell_fmt)
                col_idx += 1

            sheet.write(row_idx, col_idx, row.get('special_note') or '', wrap_fmt)
            col_idx += 1
            status_label = 'Done' if (row.get('usage_report_status') == STATUS_DONE) else 'Report Needed!'
            sheet.write(row_idx, col_idx, status_label, cell_fmt)
            col_idx += 1
            submit_dt = row.get('report_updated_at') or row.get('report_created_at')
            sheet.write(row_idx, col_idx, submit_dt or '', cell_fmt)

            row_idx += 1

        workbook.close()
        output.seek(0)
        filename_parts = ['report_pemakaian']
        if start:
            filename_parts.append(start.strftime('%Y%m%d'))
        if end:
            filename_parts.append(end.strftime('%Y%m%d'))
        filename = '_'.join(filename_parts) + '.xlsx'
        return send_file(
            output,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    finally:
        conn.close()