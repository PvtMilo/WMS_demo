import React from 'react'

export default function ItemTable({
  items = [],
  selected = {},                 // {id_code: true}
  onToggleOne,                   // (id_code) => void
  onToggleAllOnPage,             // () => void
  allSelectedOnPage = false,     // boolean
  onShowQr,                      // (id_code) => void
  onDeleteOne                    // (id_code) => void
}) {
  const safeItems = Array.isArray(items) ? items : []

  return (
    <div style={{ overflow: 'auto', border: '1px solid #eee', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={th}>
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={onToggleAllOnPage}
                aria-label="Select all on page"
              />
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
          {safeItems.length > 0 ? (
            safeItems.map((it) => {
              const picked = !!selected[it.id_code]
              return (
                <tr key={it.id_code}>
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => onToggleOne?.(it.id_code)}
                      aria-label={`Select ${it.id_code}`}
                    />
                  </td>
                  <td style={td}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.category}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{badge(it.status)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => onShowQr?.(it.id_code)} style={btn}>QR</button>
                      <button
                        type="button"
                        onClick={() => onDeleteOne?.(it.id_code)}
                        style={{ ...btn, borderColor: '#c1121f', color: '#c1121f' }}
                        aria-label={`Delete ${it.id_code}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td style={td} colSpan={8}>Belum ada data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }
const td = { padding: 10, borderBottom: '1px solid #f2f2f2' }
const btn = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }

function badge(st = '') {
  const map = {
    Good: { fg: '#06a94d', bg: '#eaf9f0' },
    Keluar: { fg: '#dd8c00', bg: '#fff3e0' },
    Rusak: { fg: '#6a0dad', bg: '#f2e8ff' },
    Hilang: { fg: '#c1121f', bg: '#fdecea' },
  }
  const { fg, bg } = map[st] || { fg: '#888', bg: '#f0f0f0' }
  return <span style={{ background: bg, color: fg, padding: '3px 8px', borderRadius: 999, fontSize: 12 }}>{st || 'Unknown'}</span>
}