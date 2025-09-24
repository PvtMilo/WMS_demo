import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import CategorySummary from '../components/CategorySummary.jsx'

const initialForm = { name: '', category: '', qty: '' }

function formatTs(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString()
}

export default function StockPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [totals, setTotals] = useState({ count: 0, qty: 0 })
  const [catSummary, setCatSummary] = useState([])
  const [action, setAction] = useState(null)
  const [actionQty, setActionQty] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [selected, setSelected] = useState({})
  const [deleteLoading, setDeleteLoading] = useState(false)

  const headerCheckboxRef = useRef(null)

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.stockSummary()
      const raw = Array.isArray(res.data) ? res.data : []
      const normalized = raw.map(item => {
        const rawCategory = typeof item?.category === 'string' ? item.category.trim() : ''
        const category = rawCategory || '(Tanpa kategori)'
        return {
          category,
          total: Number(item?.total ?? item?.total_qty ?? 0) || 0,
          item_count: Number(item?.item_count ?? item?.item_types ?? item?.count ?? 0) || 0,
        }
      })
      setCatSummary(normalized)
    } catch {
      // abaikan ringkasan jika gagal agar tabel utama tetap berjalan
    }
  }, [])

  const loadStock = useCallback(async (q = appliedSearch) => {
    setLoading(true)
    setError('')
    try {
      const params = q ? { q } : {}
      const res = await api.listStock(params)
      const data = Array.isArray(res.data) ? res.data : []
      setRows(data)
      setSelected({})
      setTotals({
        count: typeof res.total_count === 'number' ? res.total_count : data.length,
        qty: typeof res.total_qty === 'number' ? res.total_qty : data.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      })
    } catch (e) {
      setError(e.message || 'Gagal memuat data stock')
      setRows([])
      setSelected({})
      setTotals({ count: 0, qty: 0 })
    } finally {
      setLoading(false)
    }
  }, [appliedSearch])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!info) return
    const tid = setTimeout(() => setInfo(''), 4000)
    return () => clearTimeout(tid)
  }, [info])

  const selectedIds = Object.keys(selected)
  const selectedCount = selectedIds.length

  useEffect(() => {
    if (!headerCheckboxRef.current) return
    headerCheckboxRef.current.indeterminate = selectedCount > 0 && selectedCount < rows.length
  }, [selectedCount, rows.length])

  function onChangeForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (submitting) return
    const name = form.name.trim()
    const category = form.category.trim()
    const qtyNum = Number(form.qty)
    if (!name || !category) {
      setError('Nama dan kategori wajib diisi')
      return
    }
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum <= 0) {
      setError('Qty harus bilangan bulat > 0')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.createStock({ name, category, qty: qtyNum })
      setForm(initialForm)
      setInfo('Stok berhasil dicatat')
      await loadStock()
      await loadSummary()
    } catch (e) {
      setError(e.message || 'Gagal menyimpan stok')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setAppliedSearch(searchInput.trim())
  }

  function resetSearch() {
    setSearchInput('')
    setAppliedSearch('')
  }

  function toggleOne(id) {
    const key = String(id)
    setSelected(prev => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = true
      }
      return next
    })
  }

  function toggleAllOnPage() {
    setSelected(prev => {
      if (!rows.length) return {}
      const allSelected = rows.every(item => prev[String(item.id)])
      if (allSelected) {
        const next = { ...prev }
        rows.forEach(item => { delete next[String(item.id)] })
        return next
      }
      const next = { ...prev }
      rows.forEach(item => { next[String(item.id)] = true })
      return next
    })
  }

  function openRestock(item) {
    setAction({ type: 'restock', item })
    setActionQty('')
    setActionError('')
    setInfo('')
  }

  function openEdit(item) {
    setAction({ type: 'edit', item })
    setActionQty(String(item.qty ?? ''))
    setActionError('')
    setInfo('')
  }

  function closeAction() {
    setAction(null)
    setActionQty('')
    setActionError('')
    setActionLoading(false)
  }

  async function submitAction() {
    if (!action) return
    const raw = actionQty.trim()
    const qtyNum = Number(raw)
    if (raw === '') {
      setActionError('Qty wajib diisi')
      return
    }
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum)) {
      setActionError('Qty harus bilangan bulat')
      return
    }
    if (action.type === 'restock' && qtyNum <= 0) {
      setActionError('Qty restock harus > 0')
      return
    }
    if (action.type === 'edit' && qtyNum < 0) {
      setActionError('Qty tidak boleh negatif')
      return
    }

    setActionLoading(true)
    try {
      if (action.type === 'restock') {
        await api.restockStock(action.item.id, { qty: qtyNum })
        setInfo(`Qty ${action.item.name} bertambah ${qtyNum}`)
      } else {
        await api.updateStock(action.item.id, { qty: qtyNum })
        setInfo(`Qty ${action.item.name} diperbarui menjadi ${qtyNum}`)
      }
      closeAction()
      await loadStock()
      await loadSummary()
    } catch (e) {
      setActionError(e.message || 'Gagal menyimpan perubahan')
    } finally {
      setActionLoading(false)
    }
  }

  const hasSelection = selectedCount > 0
  const deleteDisabled = !hasSelection || deleteLoading

  async function handleDeleteSelected() {
    if (deleteDisabled) return
    const ids = selectedIds
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0)
    if (!ids.length) return

    const confirmMsg = ids.length === 1
      ? 'Hapus 1 data stock?'
      : `Hapus ${ids.length} data stock?`
    if (!window.confirm(confirmMsg)) return

    setDeleteLoading(true)
    setError('')
    setInfo('')
    try {
      const res = await api.deleteStockBulk(ids)
      const deleted = typeof res?.deleted === 'number' ? res.deleted : ids.length
      const requested = typeof res?.requested === 'number' ? res.requested : ids.length
      if (deleted === requested) {
        setInfo(`Berhasil menghapus ${deleted} data stock`)
      } else {
        setError(`Terhapus ${deleted} dari ${requested} data stock (cek ulang data).`)
      }
      setSelected({})
      await loadStock()
      await loadSummary()
    } catch (e) {
      setError(e.message || 'Gagal menghapus stock')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Stock</h2>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          <div>Total jenis: <b>{totals.count}</b></div>
          <div>Total qty: <b>{totals.qty}</b></div>
        </div>
      </div>

      <CategorySummary data={catSummary} />

      <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', background: 'white', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e5e5e5' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Item Name</label>
          <input value={form.name} onChange={e => onChangeForm('name', e.target.value)} placeholder="Contoh: Frame" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Kategori</label>
          <input value={form.category} onChange={e => onChangeForm('category', e.target.value)} placeholder="Contoh: 4R hitam" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Qty</label>
          <input value={form.qty} onChange={e => onChangeForm('qty', e.target.value)} placeholder="Contoh: 1000" style={inputStyle} type="number" min="1" step="1" />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" style={{ ...buttonStyle, width: '100%' }} disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Catat Stock'}
          </button>
        </div>
      </form>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Cari nama / kategori"
          style={{ ...inputStyle, maxWidth: 260 }}
        />
        <button type="submit" style={buttonStyle}>Cari</button>
        <button type="button" onClick={resetSearch} style={{ ...buttonStyle, background: 'white', color: '#333', border: '1px solid #ccc' }}>Reset</button>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={deleteDisabled}
          style={{
            ...dangerButtonStyle,
            opacity: deleteDisabled ? 0.6 : 1,
            cursor: deleteDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {deleteLoading ? 'Menghapus...' : `Delete (${selectedCount})`}
        </button>
        {appliedSearch && <span style={{ fontSize: 13, color: '#666' }}>Filter aktif: "{appliedSearch}"</span>}
        {hasSelection && <span style={{ fontSize: 13, color: '#2563eb' }}>{selectedCount} dipilih</span>}
      </form>

      {info && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: 13 }}>
          {info}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e5e5', background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ ...thStyle, width: 48 }}>
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={rows.length > 0 && rows.every(item => selected[String(item.id)])}
                  onChange={toggleAllOnPage}
                  style={{ transform: 'scale(1.05)' }}
                />
              </th>
              <th style={thStyle}>Nama</th>
              <th style={thStyle}>Kategori</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Diperbarui</th>
              <th style={thStyle}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={tdStyle} colSpan={6}>Memuat data...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td style={tdStyle} colSpan={6}>Belum ada data stock</td>
              </tr>
            ) : (
              rows.map((item, idx) => (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={!!selected[String(item.id)]}
                      onChange={() => toggleOne(item.id)}
                      style={{ transform: 'scale(1.05)' }}
                    />
                  </td>
                  <td style={tdStyle}>{item.name}</td>
                  <td style={tdStyle}>{item.category}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{item.qty}</td>
                  <td style={tdStyle}>{formatTs(item.updated_at || item.created_at)}</td>
                  <td style={{ ...tdStyle, minWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" style={smallBtn} onClick={() => openEdit(item)}>Modify Qty</button>
                      <button type="button" style={{ ...smallBtn, background: '#f59e0b', color: 'white', border: '1px solid #d97706' }} onClick={() => openRestock(item)}>Restock</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {action && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ width: 'min(420px, 90%)', background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 10px 40px rgba(15,23,42,0.25)', display: 'grid', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0' }}>{action.type === 'restock' ? 'Restock Stock' : 'Modify Quantity'}</h3>
              <div style={{ fontSize: 13, color: '#4b5563' }}>
                {action.type === 'restock'
                  ? `Tambah qty untuk ${action.item.name} (${action.item.category})`
                  : `Set qty baru untuk ${action.item.name} (${action.item.category})`}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Qty</label>
              <input
                autoFocus
                type="number"
                min={action.type === 'restock' ? 1 : 0}
                step="1"
                value={actionQty}
                onChange={e => setActionQty(e.target.value)}
                style={inputStyle}
              />
            </div>
            {actionError && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca' }}>
                {actionError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={closeAction} style={{ ...buttonStyle, background: 'white', color: '#374151', border: '1px solid #d1d5db' }} disabled={actionLoading}>
                Batal
              </button>
              <button type="button" onClick={submitAction} style={{ ...buttonStyle, minWidth: 120 }} disabled={actionLoading}>
                {actionLoading ? 'Memproses...' : (action.type === 'restock' ? 'Restock' : 'Simpan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
}

const buttonStyle = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#111827',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14,
}

const dangerButtonStyle = {
  ...buttonStyle,
  background: '#b91c1c',
}

const thStyle = {
  padding: '12px',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#6b7280',
  borderBottom: '1px solid #e5e7eb',
}

const tdStyle = {
  padding: '12px',
  fontSize: 14,
  color: '#1f2937',
  borderBottom: '1px solid #f3f4f6',
}

const smallBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #0ea5e9',
  background: '#0ea5e9',
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}