// wms/frontend/src/components/ItemTable.jsx
import React from 'react'

/**
 * Props:
 * - items: Array<{ id_code, name, category, model, rack, status, defect_level }>
 * - selected: { [id_code: string]: true }
 * - onToggleOne(id_code)
 * - onToggleAllOnPage()
 * - allSelectedOnPage: boolean
 * - onShowQr(id_code)
 * - onDeleteOne(id_code)
 */
export default function ItemTable({
  items = [],
  selected = {},
  onToggleOne,
  onToggleAllOnPage,
  allSelectedOnPage = false,
  onShowQr,
  onDeleteOne,
  canDelete = true,
  isAdmin = false,
}) {
  const safeItems = Array.isArray(items) ? items : []

  return (
    <div style={{ 
      overflow: 'auto', 
      border: '1px solid #e5e5e5', 
      borderRadius: 12, 
      backgroundColor: 'white',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderBottom: '2px solid #e5e5e5'
          }}>
            <th style={th}>
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={onToggleAllOnPage}
                aria-label="Select all on this page"
                style={{ transform: 'scale(1.1)', accentColor: '#F2C14E' }}
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
            safeItems.map((it, index) => {
              const picked = !!selected[it.id_code]
              const statusLc = (it.status || '').toLowerCase()
              const isKeluar = statusLc === 'keluar'
              const isHilang = statusLc === 'hilang'
              const delDisabled = isKeluar || (isHilang && !isAdmin)
              const delTitle = isKeluar
                ? 'Tidak bisa hapus: barang sedang dibawa event (status Keluar)'
                : (isHilang && !isAdmin
                    ? 'Tidak bisa hapus: hanya admin yang boleh menghapus item Hilang'
                    : 'Hapus item')
              return (
                <tr 
                  key={it.id_code}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white',
                    transition: 'background-color 0.2s ease',
                  }}
                  className="table-row-hover"
                >
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => onToggleOne?.(it.id_code)}
                      aria-label={`Select ${it.id_code}`}
                      style={{ transform: 'scale(1.1)', accentColor: '#F2C14E' }}
                    />
                  </td>
                  <td style={tdMono}>{it.id_code}</td>
                  <td style={td}>
                    {it.name}
                    {it.is_universal ? (
                      <span style={{ marginLeft: 8 }}>
                        {badge('Universal', '#1e40af', '#eff6ff')}
                      </span>
                    ) : null}
                  </td>
                  <td style={td}>{it.category}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{badgeStatus(it.status, it.defect_level)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteOne?.(it.id_code)}
                          style={{
                            ...btnDanger,
                            opacity: delDisabled ? 0.5 : 1,
                            cursor: delDisabled ? 'not-allowed' : 'pointer',
                          }}
                          disabled={delDisabled}
                          title={delTitle}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td style={td} colSpan={8}>&mdash; Belum ada data &mdash;</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ====== styles ====== */
const th = { 
  textAlign: 'left', 
  padding: '14px 12px', 
  borderBottom: '2px solid #e5e5e5', 
  whiteSpace: 'nowrap',
  fontWeight: 600,
  fontSize: 14,
  color: '#374151'
}
const td = { 
  padding: '12px', 
  borderBottom: '1px solid #f1f5f9', 
  verticalAlign: 'top',
  fontSize: 14,
  color: '#1f2937'
}
const tdMono = { 
  ...td, 
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontWeight: 600,
  color: '#4f46e5'
}
const btnPrimary = { 
  padding: '6px 12px', 
  border: 'none', 
  borderRadius: 6, 
  background: '#F2C14E',
  color: 'white',
  fontWeight: 500,
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}
const btnDanger = { 
  padding: '6px 12px', 
  border: '1px solid #ef4444', 
  borderRadius: 6, 
  background: 'white',
  color: '#ef4444',
  fontWeight: 500,
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

/* ====== helpers ====== */
function badge(text, fg, bg) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color: fg,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1.2,
      }}
    >
      {text}
    </span>
  )
}

/**
 * Tampilkan badge status:
 * - Good → hijau
 * - Keluar → oranye
 * - Hilang → merah tua
 * - Afkir → abu
 * - Rusak + defect_level:
 *    - ringan → kuning
 *    - berat → merah
 * - fallback "Rusak" → ungu
 */
function badgeStatus(status = '', defect = 'none') {
  const s = (status || '').toLowerCase()
  const d = (defect || 'none').toLowerCase()

  if (s === 'good') return badge('Good', '#067a3a', '#eaf9f0')
  if (s === 'keluar') return badge('Keluar', '#dd8c00', '#fff3e0')
  if (s === 'hilang') return badge('Hilang', '#b00020', '#fdecea')
  if (s === 'afkir') return badge('Afkir', '#555', '#eeeeee')

  if (s === 'rusak') {
    if (d === 'berat') return badge('Rusak berat', '#c1121f', '#ffebee') // merah
    if (d === 'ringan') return badge('Rusak ringan', '#8a6d00', '#fff9c4') // kuning
    return badge('Rusak', '#6a0dad', '#f2e8ff') // fallback
  }

  // default kalau ada status tidak dikenal
  return badge(status || 'Unknown', '#666', '#f0f0f0')
}
