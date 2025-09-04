import React, { useEffect, useState, useMemo } from 'react'
import { api, getToken } from '../api.js'
import ItemForm from '../components/ItemForm.jsx'
import ItemTable from '../components/ItemTable.jsx'
import QrModal from '../components/QrModal.jsx'
import CategorySummary from '../components/CategorySummary.jsx'
import QrLabelCard from '../components/QrLabelCard.jsx'
import '../styles/print.css'

const PER_PAGE = 100

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [selected, setSelected] = useState({})   // {id_code:true}
  const [targetCond, setTargetCond] = useState('') // '', 'good', 'rusak_ringan', 'rusak_berat'
  const [lastResult, setLastResult] = useState(null)
  const [qrId, setQrId] = useState(null)
  // Print semua QR
  const [printAllLoading, setPrintAllLoading] = useState(false)
  const [printAllList, setPrintAllList] = useState([])
  const [printingAll, setPrintingAll] = useState(false)
  const [printSelList, setPrintSelList] = useState([])
  const [printingSel, setPrintingSel] = useState(false)

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
  useEffect(() => { (async()=>{ try{ if(getToken()){ const me=await api.me(); setUser(me.user) } }catch{} })() }, [])

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
  const canDelete = String(user?.role||'').toLowerCase()==='admin' || String(user?.role||'').toLowerCase()==='pic'

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

  // Ambil semua item (tanpa filter) untuk cetak QR massal
  async function doPrintAllQr() {
    if (!confirm('Cetak semua QR untuk seluruh barang terdaftar?')) return
    setPrintAllLoading(true)
    try {
      const perPage = 100
      let pageNum = 1
      let all = []
      let totalItems = 0
      while (true) {
        const res = await api.listItems({ page: pageNum, per_page: perPage })
        const batch = res.data || []
        if (pageNum === 1) totalItems = res.total || batch.length
        all = all.concat(batch)
        if (batch.length < perPage || all.length >= totalItems) break
        pageNum += 1
      }
      // pastikan mode selected dimatikan
      setPrintSelList([])
      setPrintingSel(false)
      setPrintAllList(all)
      setPrintingAll(true)
    } catch (e) {
      alert(e.message)
    } finally {
      setPrintAllLoading(false)
    }
  }

  // Trigger print ketika data siap
  useEffect(() => {
    if (printingAll && printAllList.length > 0) {
      const after = () => { setPrintingAll(false); setPrintAllList([]) }
      window.addEventListener('afterprint', after)
      // beri waktu render
      setTimeout(() => window.print(), 150)
      return () => window.removeEventListener('afterprint', after)
    }
  }, [printingAll, printAllList])

  // Cetak QR dari item terpilih (hanya halaman ini)
  function doPrintSelectedQr() {
    if (selectedIds.length === 0) { alert('Tidak ada item yang dipilih'); return }
    const map = new Map(items.map(it => [it.id_code, it]))
    const list = selectedIds
      .map(id => map.get(id))
      .filter(Boolean)
    if (list.length === 0) { alert('Tidak ada detail item untuk dicetak'); return }
    // pastikan mode all dimatikan
    setPrintAllList([])
    setPrintingAll(false)
    setPrintSelList(list)
    setPrintingSel(true)
  }

  // Trigger print ketika data siap (selected)
  useEffect(() => {
    if (printingSel && printSelList.length > 0) {
      const after = () => { setPrintingSel(false); setPrintSelList([]) }
      window.addEventListener('afterprint', after)
      setTimeout(() => window.print(), 150)
      return () => window.removeEventListener('afterprint', after)
    }
  }, [printingSel, printSelList])

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
  const linkBtn = { ...btn, borderColor: '#111' }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <div className="noprint">
        <h2>Inventory</h2>
        <div style={{margin:'8px 0 12px', display:'flex', gap:8}}>
          <a href="/inventory/summary" style={{ ...linkBtn, textDecoration:'none', display:'inline-block' }}>Lihat Stock Summary (Print)</a>
        </div>

      {/* Ringkasan kategori (cepat) */}
      <CategorySummary data={catSummary} />

      <div className="inv-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 24 }}>
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

          {/* Cetak semua QR */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={doPrintAllQr}
              style={{ ...btn, borderColor: '#111' }}
              disabled={printAllLoading}
              title={printAllLoading ? 'Sedang menyiapkan' : ''}
            >
              {printAllLoading ? 'Menyiapkan QR…' : 'Cetak Semua QR'}
            </button>
          </div>

          {/* toolbar selection & aksi bulk */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#444' }}>Dipilih: <b>{selectedCount}</b> item</span>
            <button onClick={() => setSelected({})} style={btn}>Clear Selected</button>
            {canDelete && (
              <button
                onClick={deleteSelected}
                style={{ ...btn, borderColor: '#c1121f', color: '#c1121f' }}
                disabled={selectedCount === 0}
                title={selectedCount ? '' : 'Pilih item dulu'}
              >
                Delete Selected
              </button>
            )}

            <button
              onClick={doPrintSelectedQr}
              style={{ ...btn, borderColor: '#111' }}
              disabled={selectedCount === 0}
              title={selectedCount ? '' : 'Pilih item dulu'}
            >
              Cetak QR (Selected)
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
                onDeleteOne={canDelete ? deleteOne : undefined}
                canDelete={canDelete}
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
      {qrId && <QrModal idCode={qrId} onClose={() => setQrId(null)} />}
        </div>
      </div>

      {/* Area print untuk semua QR */}
      {printAllList.length > 0 && (
        <div className="page" style={{ marginTop: 16 }}>
          {printAllList.map((it, idx) => (
            <QrLabelCard key={`${it.id_code}-${idx}`} idCode={it.id_code} name={it.name} rack={it.rack} />
          ))}
        </div>
      )}
      {/* Area print untuk selected QR */}
      {printSelList.length > 0 && (
        <div className="page" style={{ marginTop: 16 }}>
          {printSelList.map((it, idx) => (
            <QrLabelCard key={`${it.id_code}-${idx}`} idCode={it.id_code} name={it.name} rack={it.rack} />
          ))}
        </div>
      )}
    </div>
  )
}


