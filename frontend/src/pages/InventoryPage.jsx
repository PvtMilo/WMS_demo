import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ItemForm from '../components/ItemForm.jsx'
import ItemTable from '../components/ItemTable.jsx'
import QrModal from '../components/QrModal.jsx'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [qrId, setQrId] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({}) // {id_code:true}

  async function refresh() {
    setLoading(true); setError('')
    try {
      const data = await api.listItems(q ? { q } : {})
      setItems(data.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  // selection utils
  const selectedCount = Object.keys(selected).length
  const allSelectedOnPage = items.length > 0 && items.every(it => selected[it.id_code])

  function toggleOne(id) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  function toggleAllOnPage() {
    setSelected(prev => {
      const next = { ...prev }
      if (allSelectedOnPage) {
        // unselect semua yang sedang tampil
        for (const it of items) delete next[it.id_code]
      } else {
        // select semua yang sedang tampil
        for (const it of items) next[it.id_code] = true
      }
      return next
    })
  }

  async function deleteOne(id) {
    if (!confirm(`Hapus item ${id}?`)) return
    try {
      await api.deleteItem(id)
      setSelected(prev => { const n = { ...prev }; delete n[id]; return n })
      await refresh()
    } catch (e) {
      alert(e.message)
    }
  }

  async function deleteSelected() {
    const ids = Object.keys(selected)
    if (ids.length === 0) return alert('Tidak ada item yang dipilih')
    if (!confirm(`Hapus ${ids.length} item terpilih?`)) return
    try {
      // sederhana: panggil satu-per-satu
      for (const id of ids) {
        try { await api.deleteItem(id) } catch (_) { /* lanjutkan */ }
      }
      setSelected({})
      await refresh()
    } catch (e) {
      alert(e.message)
    }
  }

  const ipt = { flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 8 }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Inventory</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div>
          <ItemForm onCreated={refresh} />
        </div>

        <div>
          {/* toolbar pencarian & aksi bulk */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Cari id/nama/model..."
              style={ipt}
            />
            <button onClick={refresh} style={{ padding: '8px 12px' }}>Cari</button>

            <span style={{ color: '#444' }}>Dipilih: <b>{selectedCount}</b> item</span>
            <button onClick={() => setSelected({})} style={{ padding: '8px 12px' }}>
              Clear Selected
            </button>
            <button
              onClick={deleteSelected}
              style={{ padding: '8px 12px', border: '1px solid #c1121f', color: '#c1121f', background: '#fff', borderRadius: 8 }}
              disabled={selectedCount === 0}
              title={selectedCount ? '' : 'Pilih item dulu'}
            >
              Delete Selected
            </button>
          </div>

          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          {loading ? 'Loading…' : (
            <ItemTable
              items={items}
              selected={selected}
              onToggleOne={toggleOne}
              onToggleAllOnPage={toggleAllOnPage}
              allSelectedOnPage={allSelectedOnPage}
              onShowQr={setQrId}
              onDeleteOne={deleteOne}
            />
          )}
        </div>
      </div>

      {qrId && <QrModal idCode={qrId} onClose={() => setQrId(null)} />}
    </div>
  )
}