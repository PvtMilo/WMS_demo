import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../api.js'
import ItemForm from '../components/ItemForm.jsx'
import ItemTable from '../components/ItemTable.jsx'
import QrModal from '../components/QrModal.jsx'
import CategorySummary from '../components/CategorySummary.jsx'

const PER_PAGE = 100

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [selected, setSelected] = useState({})   // {id_code:true}
  const [targetCond, setTargetCond] = useState('') // '', 'good', 'rusak_ringan', 'rusak_berat'
  const [lastResult, setLastResult] = useState(null)
  const [qrId, setQrId] = useState(null)

  // Ringkasan kategori (cepat, tidak ikut filter search)
  const [catSummary, setCatSummary] = useState([])

  async function loadSummary() {
    try {
      const res = await api.summaryByCategory()
      setCatSummary(res.data || [])
    } catch {
      // abaikan kalau gagal
    }
  }

  async function refresh({ keepPage = true } = {}) {
    setLoading(true); setError('')
    const currentPage = keepPage ? page : 1
    try {
      const res = await api.listItems({ q, page: currentPage, per_page: PER_PAGE })
      setItems(res.data || [])
      setTotal(res.total || 0)
      setPage(res.page || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- INIT: muat data & ringkasan pertama kali
  useEffect(() => {
    refresh({ keepPage: false })
    loadSummary()
  }, [])

  // --- PAGING: pindah halaman -> fetch data halaman itu
  useEffect(() => {
    refresh({ keepPage: true })
  }, [page])

  // --- IMPORTANT: reset selection setiap kali ganti page atau keyword search
  useEffect(() => {
    setSelected({})
  }, [page, q])

  // ===== selection utils =====
  const selectedIds = useMemo(() => Object.keys(selected), [selected])
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
  const row = items.find(it => it.id_code === id)
  if (row && row.status === 'Keluar') {
    alert('Tidak bisa hapus: barang sedang dibawa event')
    return
  }
  if (!confirm(`Hapus item ${id}?`)) return
  try {
    await api.deleteItem(id)
    setSelected(prev => { const n = { ...prev }; delete n[id]; return n })
    await refresh({ keepPage: true })
    await loadSummary()
  } catch (e) { alert(e.message) }
}

async function deleteSelected() {
  const ids = selectedIds
  if (ids.length === 0) return alert('Tidak ada item yang dipilih')

  // Pisahkan yang statusnya Keluar (tidak boleh dihapus)
  const selectedRows = items.filter(it => selected[it.id_code])
  const locked = selectedRows.filter(it => it.status === 'Keluar').map(it => it.id_code)
  const allowed = ids.filter(id => !locked.includes(id))

  if (locked.length > 0) {
    alert(`Lewati ${locked.length} item (status Keluar) — tidak bisa dihapus: \n${locked.join(', ')}`)
  }
  if (allowed.length === 0) {
    setSelected({})
    return
  }
  if (!confirm(`Hapus ${allowed.length} item terpilih (selain yang Keluar)?`)) return

  try {
    for (const id of allowed) {
      try { await api.deleteItem(id) } catch (_) { /* lanjut item lain */ }
    }
    setSelected({})
    await refresh({ keepPage: true })
    await loadSummary()
  } catch (e) {
    alert(e.message)
  }
}

  // === GUARD: hanya apply ke item yang DIPILIH, dan wajib ada selection
  async function applyBulkCondition() {
    if (!targetCond) { alert('Pilih status/cond dulu'); return }
    if (selectedIds.length === 0) { alert('Tidak ada item yang dipilih'); return }

    const label =
      targetCond === 'good' ? 'Good' :
      targetCond === 'rusak_ringan' ? 'Rusak ringan' :
      'Rusak berat'

    if (!confirm(`Ubah ${selectedIds.length} item terpilih menjadi "${label}"?`)) return

    try {
      const out = await api.bulkUpdateCondition({ ids: selectedIds, condition: targetCond })
      setLastResult(out)
      setSelected({})
      setTargetCond('')
      await refresh({ keepPage: true })
      await loadSummary()
    } catch (e) { alert(e.message) }
  }

  function doSearch() {
    setPage(1)          // reset ke halaman 1
    refresh({ keepPage: false })
  }
  function onKeyDownSearch(e){
    if (e.key === 'Enter') { doSearch() }
  }

  // info paging
  const startIdx = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const endIdx = Math.min(page * PER_PAGE, total)
  const pages = Math.max(1, Math.ceil((total || 0) / PER_PAGE))

  // buat window nomor halaman (maks 7 tombol)
  const pageNumbers = useMemo(() => {
    const maxButtons = 7
    if (pages <= maxButtons) return Array.from({ length: pages }, (_, i) => i + 1)
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, page - half)
    let end = start + maxButtons - 1
    if (end > pages) { end = pages; start = end - maxButtons + 1 }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [pages, page])

  const ipt = { flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 8 }
  const btn = { padding: '8px 12px', border: '1px solid #ddd', background: '#fff', borderRadius: 8, cursor: 'pointer' }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Inventory</h2>

      {/* Ringkasan kategori (cepat) */}
      <CategorySummary data={catSummary} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div>
          <ItemForm onCreated={async () => { await refresh({ keepPage: true }); await loadSummary() }} />
        </div>

        <div>
          {/* toolbar pencarian */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder='Cari id/nama/kategori/model/rak/status...'
              style={ipt}
            />
            <button onClick={doSearch} style={btn}>Cari</button>
            <span style={{ fontSize: 12, color: '#777' }}>
              Menampilkan <b>{startIdx}</b>–<b>{endIdx}</b> dari <b>{total}</b> item
              {total > PER_PAGE && ' · perketat pencarian jika hasil terlalu banyak'}
            </span>
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
            <select
              value={targetCond}
              onChange={e => setTargetCond(e.target.value)}
              style={{ ...ipt, maxWidth: 220 }}
              disabled={selectedCount === 0}   // ⬅️ disable kalau belum ada pilihan
            >
              <option value="">-- pilih --</option>
              <option value="good">Good</option>
              <option value="rusak_ringan">Rusak ringan</option>
              <option value="rusak_berat">Rusak berat</option>
            </select>
            <button
              onClick={applyBulkCondition}
              style={{ ...btn, borderColor: '#111' }}
              disabled={!targetCond || selectedCount === 0}  // ⬅️ guard di UI
            >
              Submit Perubahan
            </button>
          </div>

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
            <>
              <ItemTable
                items={items}
                selected={selected}
                onToggleOne={toggleOne}
                onToggleAllOnPage={toggleAllOnPage}
                allSelectedOnPage={allSelectedOnPage}
                onShowQr={setQrId}
                onDeleteOne={deleteOne}
              />

              {/* Pagination */}
              <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button style={btn} disabled={page === 1} onClick={() => setPage(1)}>First</button>
                <button style={btn} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                {pageNumbers[0] > 1 && <span>…</span>}
                {pageNumbers.map(n => (
                  <button
                    key={n}
                    style={{ ...btn, ...(n === page ? { background: '#111', color: '#fff', borderColor: '#111' } : {}) }}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                {pageNumbers[pageNumbers.length - 1] < pages && <span>…</span>}
                <button style={btn} disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
                <button style={btn} disabled={page === pages} onClick={() => setPage(pages)}>Last</button>
              </div>
            </>
          )}
        </div>
      </div>

      {qrId && <QrModal idCode={qrId} onClose={() => setQrId(null)} />}
    </div>
  )
}