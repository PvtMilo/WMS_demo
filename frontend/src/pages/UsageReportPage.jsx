import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { formatDateTime } from '../utils/date.js'

const STATUS_PENDING = 'pending'
const STATUS_DONE = 'done'

function formatEventDate(start) {
  if (!start) return '-'
  return formatDateTime(start, { dateOnly: true })
}

function usageBadge(status) {
  const pending = (status || STATUS_PENDING).toLowerCase() !== STATUS_DONE
  const style = {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    background: pending ? '#fee2e2' : '#dcfce7',
    color: pending ? '#b91c1c' : '#15803d',
    fontWeight: 600,
    fontSize: 12,
  }
  return <span style={style}>{pending ? 'Report Needed!' : 'Done'}</span>
}

export default function UsageReportPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const buildItemKey = (name, category) => {
    const rawName = String(name || '').trim()
    const rawCat = String(category || '').trim()
    return `${rawName.toLowerCase()}||${rawCat.toLowerCase()}`
  }

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [status, setStatus] = useState(STATUS_PENDING)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const spStart = searchParams.get('start') || ''
    const spEnd = searchParams.get('end') || ''
    const spStatus = searchParams.get('status') || STATUS_PENDING
    const spQ = searchParams.get('q') || ''
    setStart(spStart)
    setEnd(spEnd)
    setStatus(spStatus || STATUS_PENDING)
    setQ(spQ)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = {}
    if (start) params.start = start
    if (end) params.end = end
    if (status) params.status = status
    if (q) params.q = q
    const newSearch = new URLSearchParams(params)
    setSearchParams(newSearch)
  }, [start, end, status, q, setSearchParams])

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (start) params.start = start
      if (end) params.end = end
      if (status) params.status = status
      if (q) params.q = q
      const res = await api.usageReportList(params)
      setData(res.data || [])
    } catch (err) {
      setError(err.message || 'Gagal memuat report pemakaian')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [start, end, status, q])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const itemColumns = useMemo(() => {
    const map = new Map();
    for (const row of data) {
      const items = Array.isArray(row.items) ? row.items : [];
      for (const item of items) {
        const key = buildItemKey(item.stock_name, item.stock_category);
        if (!map.has(key)) {
          const labelBase = String(item.stock_name || '').trim() || '(Tanpa nama)';
          const label = item.stock_category ? `${labelBase} (${item.stock_category})` : labelBase;
          map.set(key, { key, label });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  useEffect(() => {
    if (!info) return
    const tid = setTimeout(() => setInfo(''), 3500)
    return () => clearTimeout(tid)
  }, [info])

  function resolveUsageValue(row, columnKey) {
    const items = Array.isArray(row.items) ? row.items : [];
    let total = 0;
    for (const item of items) {
      if (buildItemKey(item.stock_name, item.stock_category) === columnKey) {
        const qty = Number(item.qty_used || 0);
        if (Number.isFinite(qty)) total += qty;
      }
    }
    return total;
  }


  async function handleExport() {
    try {
      const params = {}
      if (start) params.start = start
      if (end) params.end = end
      if (status) params.status = status
      if (q) params.q = q
      const blob = await api.exportUsageReport(params)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `report-pemakaian-${timestamp}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Gagal mengunduh laporan')
    }
  }

  const filteredCount = data.length

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h2 style={{ margin: 0 }}>Report Pemakaian</h2>
        <button style={{ ...btn, background: '#0f172a', color: '#fff' }} onClick={handleExport}>
          Export Excel
        </button>
      </div>
      <p style={{ maxWidth: 720, color: '#4b5563', lineHeight: 1.5 }}>
        Catat pemakaian stok untuk setiap event agar stok gudang tetap akurat. Kontainer dengan status
        <b> Report Needed!</b> wajib dilengkapi sebelum proses selesai.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ fontSize: 13 }}>
          Tanggal mulai
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={ipt}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Tanggal akhir
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={ipt}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={ipt}>
            <option value={STATUS_PENDING}>Report Needed!</option>
            <option value={STATUS_DONE}>Done</option>
            <option value="">Semua</option>
          </select>
        </label>
        <label style={{ fontSize: 13, flexGrow: 1, minWidth: 220 }}>
          Cari event / PIC / lokasi
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Misal: Wedding / Jakarta"
            style={{ ...ipt, width: '96%' }}
          />
        </label>
      </div>

      {info && (
        <div style={infoBox}>{info}</div>
      )}
      {error && (
        <div style={errorBox}>{error}</div>
      )}

      <div style={{ border: '1px solid #e5e5e5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={th}>Tanggal Event</th>
              <th style={th}>Job / Order</th>
              <th style={th}>Nama Event</th>
              <th style={th}>Lokasi</th>
              <th style={th}>PIC / Crew</th>
              <th style={th}>Kendaraan</th>
              {itemColumns.map((col) => (
                <th key={col.key} style={th}>{col.label}</th>
              ))}
              <th style={th}>Catatan</th>
              <th style={th}>Status</th>
              <th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={itemColumns.length + 9}>Memuat data...</td>
              </tr>
            ) : filteredCount === 0 ? (
              <tr>
                <td style={td} colSpan={itemColumns.length + 9}>Belum ada report pada rentang tanggal ini.</td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.container_id}
                  style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    transition: 'background 0.2s ease',
                  }}
                  className="table-row-hover"
                >
                  <td style={td}>{formatEventDate(row.start_date)}</td>
                  <td style={td}>{row.order_title || '-'}</td>
                  <td style={td}>{row.event_name || '-'}</td>
                  <td style={td}>{row.location || '-'}</td>
                  <td style={td}>{[row.pic, row.crew].filter(Boolean).join(' / ') || '-'}</td>
                  <td style={td}>{row.vehicle || '-'}</td>
                  {itemColumns.map((col) => {
                    const value = resolveUsageValue(row, col.key);
                    return (
                      <td
                        key={col.key}
                        style={{
                          ...td,
                          textAlign: 'center',
                          fontWeight: value > 0 ? 600 : 400,
                        }}
                      >
                        {value > 0 ? value : '-'}
                      </td>
                    );
                  })}
                  <td style={td}>{row.special_note || '-'}</td>
                  <td style={td}>{usageBadge(row.usage_report_status)}</td>
                  <td style={td}>
                    <button
                      style={btnLink}
                      onClick={() => navigate(`/reports/usage/${row.container_id}`)}
                    >
                      Isi / Lihat Report
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ipt = {
  display: 'block',
  marginTop: 4,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
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

const btn = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #1e293b',
  background: '#fff',
  color: '#1e293b',
  cursor: 'pointer',
  fontWeight: 600,
}

const btnLink = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid #0ea5e9',
  background: '#0ea5e9',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
}

const infoBox = {
  background: '#ecfdf5',
  color: '#047857',
  border: '1px solid #a7f3d0',
  padding: '10px 12px',
  borderRadius: 8,
  marginBottom: 12,
}

const errorBox = {
  background: '#fef2f2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  padding: '10px 12px',
  borderRadius: 8,
  marginBottom: 12,
}
