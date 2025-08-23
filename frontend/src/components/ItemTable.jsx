// src/components/ItemTable.jsx
import React from 'react'

export default function ItemTable({
  items = [],
  selected = {},
  onToggleOne,
  onToggleAllOnPage,
  allSelectedOnPage = false,
  onShowQr,
  onDeleteOne
}) {
  const safeItems = Array.isArray(items) ? items : []

  return (
    <div style={{ overflow: 'auto', border: '1px solid #eee', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={th}>
              <input type="checkbox" checked={allSelectedOnPage} onChange={onToggleAllOnPage} />
            </th>
            <th style={th}>ID</th>
            <th style={th}>Nama</th>
            <th style={th}>Kategori</th>
            <th style={th}>Model</th>
            <th style={th}>Rak</th>
            <th style={th}>Status</th>
            <th style={th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {safeItems.length ? safeItems.map(it => {
            const picked = !!selected[it.id_code]
            return (
              <tr key={it.id_code}>
                <td style={td}>
                  <input type="checkbox" checked={picked} onChange={() => onToggleOne?.(it.id_code)} />
                </td>
                <td style={td}>{it.id_code}</td>
                <td style={td}>{it.name}</td>
                <td style={td}>{it.category}</td>
                <td style={td}>{it.model}</td>
                <td style={td}>{it.rack}</td>
                <td style={td}>{badgeStatus(it.status, it.defect_level)}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => onShowQr?.(it.id_code)} style={btn}>QR</button>
                    <button type="button" onClick={() => onDeleteOne?.(it.id_code)} style={{ ...btn, borderColor: '#c1121f', color: '#c1121f' }}>Delete</button>
                  </div>
                </td>
              </tr>
            )
          }) : (
            <tr><td style={td} colSpan={8}>Belum ada data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }
const td = { padding: 10, borderBottom: '1px solid #f2f2f2' }
const btn = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }

// === NEW: badge berdasarkan status + defect_level
function badgeStatus(status = '', defect = 'none') {
  // normalisasi
  const s = (status || '').toLowerCase()
  const d = (defect || 'none').toLowerCase()

  // mapping warna
  const pill = (text, fg, bg) => (
    <span style={{ background: bg, color: fg, padding: '3px 8px', borderRadius: 999, fontSize: 12 }}>
      {text}
    </span>
  )

  if (s === 'good') return pill('Good', '#067a3a', '#eaf9f0')
  if (s === 'keluar') return pill('Keluar', '#dd8c00', '#fff3e0')
  if (s === 'hilang') return pill('Hilang', '#c1121f', '#fdecea')
  if (s === 'afkir') return pill('Afkir', '#555', '#eee')

  // status Rusak → pecah jadi ringan/berat dari defect_level
  if (s === 'rusak') {
    if (d === 'berat') return pill('Rusak berat', '#c1121f', '#ffebee')   // merah
    if (d === 'ringan') return pill('Rusak ringan', '#8a6d00', '#fff9c4') // kuning
    return pill('Rusak', '#6a0dad', '#f2e8ff') // fallback kalau defect_level tidak terisi
  }

  // default fallback
  return pill(status || 'Unknown', '#666', '#f0f0f0')
}