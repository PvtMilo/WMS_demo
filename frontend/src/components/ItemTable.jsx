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
                aria-label="Select all on this page"
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
              const isKeluar = (it.status || '').toLowerCase() === 'keluar'
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
                  <td style={tdMono}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.category}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{badgeStatus(it.status, it.defect_level)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onShowQr?.(it.id_code)}
                        style={btn}
                        title="Lihat / cetak QR"
                      >
                        QR
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteOne?.(it.id_code)}
                          style={{
                            ...btn,
                            borderColor: '#c1121f',
                            color: '#c1121f',
                            opacity: isKeluar ? 0.5 : 1,
                            cursor: isKeluar ? 'not-allowed' : 'pointer',
                          }}
                          disabled={isKeluar}
                          title={
                            isKeluar
                              ? 'Tidak bisa hapus: barang sedang dibawa event (status Keluar)'
                              : 'Hapus item'
                          }
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
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }
const td = { padding: 10, borderBottom: '1px solid #f2f2f2', verticalAlign: 'top' }
const tdMono = { ...td, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }
const btn = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }

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
