import React, { useEffect, useMemo, useState } from 'react'
import QrLabelCard from '../components/QrLabelCard.jsx'
import '../styles/print.css'
import { api } from '../api.js'

export default function PrintLabelsPage() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState({}) // {id_code: qty}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // === data fetch ===
  async function search() {
    setLoading(true); setError('')
    try {
      const res = await api.listItems(query ? { q: query } : {})
      setItems(res.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  // === helpers selected ===
  const selectedCountItems = Object.keys(selected).length
  const selectedCountLabels = Object.values(selected).reduce((a, b) => a + (Number(b) || 0), 0)

  function isAllSelectedOnPage() {
    if (!items.length) return false
    return items.every(it => selected[it.id_code] > 0)
  }

  function togglePick(it) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[it.id_code]) delete next[it.id_code]
      else next[it.id_code] = 1
      return next
    })
  }

  function setQty(id, qty) {
    const val = Math.max(1, Math.min(50, Number(qty) || 1))
    setSelected(prev => ({ ...prev, [id]: val }))
  }

  function toggleSelectAllOnPage() {
    const all = isAllSelectedOnPage()
    setSelected(prev => {
      const next = { ...prev }
      if (all) {
        // unselect all items currently shown
        for (const it of items) delete next[it.id_code]
      } else {
        // select all shown (qty default 1 jika belum ada)
        for (const it of items) if (!next[it.id_code]) next[it.id_code] = 1
      }
      return next
    })
  }

  function clearSelection() { setSelected({}) }

  // === build labels to render ===
  const labelList = useMemo(() => {
    const out = []
    // gunakan urutan items (hasil pencarian) agar konsisten
    for (const it of items) {
      const qty = selected[it.id_code] || 0
      for (let i = 0; i < qty; i++) out.push(it)
    }
    return out
  }, [items, selected])

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Print QR Labels</h2>

      {/* Controls (non-print area) */}
      <div className="noprint">
        <div className="controls">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari id/nama/model…"
            style={{ flex: 1, minWidth: 260, padding: 8, border: '1px solid #ddd', borderRadius: 8 }}
          />
          <button onClick={search} style={btn}>Cari</button>

          {/* Info pilihan */}
          <span style={{ alignSelf: 'center', color: '#444' }}>
            Dipilih: <b>{selectedCountItems}</b> item · <b>{selectedCountLabels}</b> label
          </span>

          <button
            onClick={() => window.print()}
            style={btnDark}
            disabled={!labelList.length}
            title={labelList.length ? '' : 'Pilih item dulu'}
          >
            Print ({labelList.length})
          </button>
          <button onClick={clearSelection} style={btnLight}>Reset Pilihan</button>
        </div>

        {error && <div style={{ color: 'crimson' }}>{error}</div>}

        {/* Tabel pilih item */}
        <div style={{ marginTop: 8, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={th}></th>
                <th style={th}>ID</th>
                <th style={th}>Nama</th>
                <th style={th}>Model</th>
                <th style={th}>Rak</th>
                <th style={th}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={td} colSpan={6}>Loading…</td></tr>
              ) : (items.length ? items.map(it => {
                const picked = !!selected[it.id_code]
                return (
                  <tr key={it.id_code}>
                    <td style={td}>
                      <input type="checkbox" checked={picked} onChange={() => togglePick(it)} />
                    </td>
                    <td style={td}>{it.id_code}</td>
                    <td style={td}>{it.name}</td>
                    <td style={td}>{it.model}</td>
                    <td style={td}>{it.rack}</td>
                    <td style={td}>
                      {picked ? (
                        <input
                          type="number" min={1} max={50}
                          value={selected[it.id_code] ?? 1}
                          onChange={e => setQty(it.id_code, e.target.value)}
                          style={{ width: 64, padding: 6, border: '1px solid #ddd', borderRadius: 6 }}
                        />
                      ) : <span style={{ color:'#888' }}>-</span>}
                    </td>
                  </tr>
                )
              }) : (
                <tr><td style={td} colSpan={6}>Tidak ada data</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Area print */}
      {labelList.length > 0 && (
        <div className="page" style={{ marginTop: 16 }}>
          {labelList.map((it, idx) => (
            <QrLabelCard key={`${it.id_code}-${idx}`} idCode={it.id_code} name={it.name} rack={it.rack} />
          ))}
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }
const td = { padding: 10, borderBottom: '1px solid #f2f2f2' }
const btn = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }
const btnLight = { ...btn }
const btnDark = { ...btn, background: '#111', color: '#fff', borderColor: '#111' }
