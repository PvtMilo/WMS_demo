import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ItemForm from '../components/ItemForm.jsx'
import ItemTable from '../components/ItemTable.jsx'
import QrModal from '../components/QrModal.jsx'
import CategorySummary from '../components/CategorySummary.jsx'   // <— NEW

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [qrId, setQrId] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({}) // {id_code:true}

  // NEW: ringkasan kategori
  const [catSummary, setCatSummary] = useState([])

  // state bulk modify (dari versi sebelumnya)
  const [targetCond, setTargetCond] = useState('')
  const [lastResult, setLastResult] = useState(null)

  async function loadSummary() {
    try {
      const res = await api.summaryByCategory()
      setCatSummary(res.data || [])
    } catch (e) {
      // biarkan diam kalau gagal ringkasan
    }
  }

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
    // selalu perbarui ringkasan tiap refresh
    await loadSummary()
  }

  useEffect(() => { refresh() }, [])

  // ===== selection utils =====
  const selectedIds = Object.keys(selected)
  const selectedCount = selectedIds.length
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
        for (const it of items) delete next[it.id_code]
      } else {
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
    const ids = selectedIds
    if (ids.length === 0) return alert('Tidak ada item yang dipilih')
    if (!confirm(`Hapus ${ids.length} item terpilih?`)) return
    try {
      for (const id of ids) {
        try { await api.deleteItem(id) } catch (_) {}
      }
      setSelected({})
      await refresh()
    } catch (e) {
      alert(e.message)
    }
  }

  async function applyBulkCondition() {
    if (!targetCond) return alert('Pilih status/cond dulu')
    if (selectedIds.length === 0) return alert('Tidak ada item yang dipilih')
    const label = targetCond === 'good' ? 'Good'
                : targetCond === 'rusak_ringan' ? 'Rusak ringan'
                : 'Rusak berat'
    if (!confirm(`Ubah ${selectedIds.length} item menjadi "${label}"?`)) return

    try {
      const out = await api.bulkUpdateCondition({ ids: selectedIds, condition: targetCond })
      setLastResult(out)
      setSelected({})
      setTargetCond('')
      await refresh()
    } catch (e) {
      alert(e.message)
    }
  }

  const ipt = { flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 8 }
  const btn = { padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Inventory</h2>

      {/* NEW: Ringkasan kategori */}
      <CategorySummary data={catSummary} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div>
          <ItemForm onCreated={refresh} />
        </div>

        <div>
          {/* toolbar pencarian */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari id/nama/model..." style={ipt} />
            <button onClick={refresh} style={btn}>Cari</button>
          </div>

          {/* toolbar selection & aksi bulk */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#444' }}>Dipilih: <b>{selectedCount}</b> item</span>
            <button onClick={() => setSelected({})} style={btn}>Clear Selected</button>
            <button
              onClick={deleteSelected}
              style={{ ...btn, borderColor: '#c1121f', color: '#c1121f' }}
              disabled={selectedCount === 0}
              title={selectedCount ? '' : 'Pilih item dulu'}
            >
              Delete Selected
            </button>

            <span style={{ marginLeft: 12, color: '#666' }}>Ubah status ke:</span>
            <select value={targetCond} onChange={e => setTargetCond(e.target.value)} style={{ ...ipt, maxWidth: 220 }}>
              <option value="">-- pilih --</option>
              <option value="good">Good</option>
              <option value="rusak_ringan">Rusak ringan</option>
              <option value="rusak_berat">Rusak berat</option>
            </select>
            <button
              onClick={applyBulkCondition}
              style={{ ...btn, borderColor: '#111' }}
              disabled={!targetCond || selectedCount === 0}
            >
              Submit Perubahan
            </button>
          </div>

          {/* hasil terakhir */}
          {lastResult && (
            <div style={{ marginBottom: 8, padding: 8, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }}>
              <div><b>Perubahan diterapkan:</b> {lastResult.counts?.updated || 0} updated, {lastResult.counts?.skipped || 0} skipped</div>
              {Array.isArray(lastResult.skipped) && lastResult.skipped.length > 0 && (
                <ul style={{ margin: '6px 0 0 20px' }}>
                  {lastResult.skipped.map((s, i) => <li key={i}>{s.id_code}: {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}

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