import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { formatDateTime } from '../utils/date.js'

function makeKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function emptyItem() {
  return { key: makeKey(), stockId: '', qty: '', note: '', baseQty: 0 }
}

export default function UsageReportDetail() {
  const { cid } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [container, setContainer] = useState(null)
  const [items, setItems] = useState([emptyItem()])
  const [vehicle, setVehicle] = useState('')
  const [specialNote, setSpecialNote] = useState('')
  const [stockOptions, setStockOptions] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.usageReportDetail(cid)
        setContainer(res.container || null)
        setVehicle(res.report?.vehicle || '')
        setSpecialNote(res.report?.special_note || '')
        setStockOptions(res.stock_options || [])
        if (Array.isArray(res.items) && res.items.length) {
          const mapped = res.items.map((it) => ({
            key: makeKey(),
            stockId: String(it.stock_id),
            qty: String(it.qty_used ?? ''),
            note: it.note || '',
            baseQty: Number(it.qty_before ?? 0),
          }))
          setItems(mapped)
        } else {
          setItems([emptyItem()])
        }
      } catch (err) {
        setError(err.message || 'Gagal memuat detail report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cid])

  useEffect(() => {
    if (!info) return
    const tid = setTimeout(() => setInfo(''), 3500)
    return () => clearTimeout(tid)
  }, [info])

  const stockMap = useMemo(() => {
    const map = new Map()
    for (const s of stockOptions) {
      map.set(String(s.id), s)
    }
    return map
  }, [stockOptions])

  function updateItem(idx, patch) {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  function addRow() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeRow(idx) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  function handleStockChange(idx, stockId) {
    const opt = stockMap.get(String(stockId))
    updateItem(idx, {
      stockId: stockId ? String(stockId) : '',
      baseQty: opt ? Number(opt.qty || 0) : 0,
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    const payloadItems = []
    for (const row of items) {
      const stockId = String(row.stockId || '').trim()
      const qtyNum = Number(row.qty)
      if (!stockId || !Number.isFinite(qtyNum) || qtyNum <= 0) continue
      payloadItems.push({
        stock_id: Number(stockId),
        qty: qtyNum,
        note: (row.note || '').trim(),
      })
    }
    if (!payloadItems.length) {
      setError('Minimal satu item pemakaian dengan qty > 0')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.saveUsageReport(cid, {
        vehicle,
        special_note: specialNote,
        items: payloadItems,
      })
      setInfo('Report pemakaian tersimpan')
      navigate('/reports/usage')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan report')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Memuat...</div>
  }
  if (!container) {
    return <div style={{ padding: 24, color: '#b91c1c' }}>{error || 'Container tidak ditemukan'}</div>
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Report Pemakaian - {container.id}</h2>
        <button style={btnSecondary} onClick={() => navigate('/reports/usage')}>
          &larr; Kembali
        </button>
      </div>

      {error && (
        <div style={errorBox}>{error}</div>
      )}
      {info && (
        <div style={infoBox}>{info}</div>
      )}

      <section style={card}>
        <h3 style={{ marginTop: 0 }}>Detail Event</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <DetailRow label="Nama Event" value={container.event_name || '-'} />
          <DetailRow label="Job / Order" value={container.order_title || '-'} />
          <DetailRow label="PIC" value={container.pic || '-'} />
          <DetailRow label="Crew" value={container.crew || '-'} />
          <DetailRow label="Lokasi" value={container.location || '-'} />
          <DetailRow label="Tanggal Mulai" value={formatDateTime(container.start_date, { monthText: true }) || '-'} />
          <DetailRow label="Tanggal Selesai" value={formatDateTime(container.end_date, { monthText: true }) || '-'} />
          <DetailRow label="Status Report" value={container.usage_report_status === 'done' ? 'Done' : 'Report Needed!'} />
        </div>
      </section>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <section style={card}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))' }}>
            <label style={label}>
              Kendaraan
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="Contoh: Truk BOX"
                style={ipt}
              />
            </label>
            <label style={label}>
              Catatan Khusus
              <textarea
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                style={{ ...ipt, minHeight: 80, resize: 'vertical' }}
              />
            </label>
          </div>
        </section>

        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Pemakaian Stok</h3>
            <button type="button" style={btnSecondary} onClick={addRow}>
              + Tambah baris
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={th}>Stok</th>
                  <th style={th}>Qty Pakai</th>
                  <th style={th}>Sisa (estimasi)</th>
                  <th style={th}>Catatan</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const opt = stockMap.get(String(row.stockId))
                  const baseQty = row.baseQty || Number(opt?.qty || 0)
                  const qtyNum = Number(row.qty || 0)
                  const remaining = baseQty - (Number.isFinite(qtyNum) ? qtyNum : 0)
                  return (
                    <tr key={row.key}>
                      <td style={td}>
                        <select
                          value={row.stockId}
                          onChange={(e) => handleStockChange(idx, e.target.value)}
                          style={{ ...ipt, minWidth: 220 }}
                          required
                        >
                          <option value="">-- pilih stok --</option>
                          {stockOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.category}) - stok {s.qty}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.qty}
                          onChange={(e) => updateItem(idx, { qty: e.target.value })}
                          style={{ ...ipt, maxWidth: 140 }}
                          required
                        />
                      </td>
                      <td style={td}>
                        {row.stockId ? (
                          <span style={{ fontWeight: 600, color: remaining < 0 ? '#b91c1c' : '#0f766e' }}>
                            Sisa {remaining >= 0 ? remaining : 0}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={td}>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateItem(idx, { note: e.target.value })}
                          placeholder="Catatan item (opsional)"
                          style={{ ...ipt, minWidth: 160 }}
                        />
                      </td>
                      <td style={td}>
                        <button type="button" style={btnDanger} onClick={() => removeRow(idx)} disabled={items.length <= 1}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" style={btnSecondary} onClick={() => navigate('/reports/usage')}>
            Batal
          </button>
          <button type="submit" style={btnPrimary} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Report'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

const th = {
  padding: '12px 10px',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748b',
  borderBottom: '1px solid #e2e8f0',
}

const td = {
  padding: '12px 10px',
  fontSize: 14,
  color: '#0f172a',
  borderBottom: '1px solid #eef2ff',
  verticalAlign: 'top',
}

const card = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 16,
  background: '#fff',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
}

const label = {
  display: 'grid',
  gap: 4,
  fontSize: 13,
  color: '#475569',
}

const ipt = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
}

const btnPrimary = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #cbd5f5',
  background: '#fff',
  color: '#1e293b',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDanger = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #ef4444',
  background: '#fff',
  color: '#b91c1c',
  cursor: 'pointer',
}

const infoBox = {
  background: '#ecfdf5',
  color: '#047857',
  border: '1px solid #a7f3d0',
  padding: '10px 12px',
  borderRadius: 8,
}

const errorBox = {
  background: '#fef2f2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  padding: '10px 12px',
  borderRadius: 8,
}