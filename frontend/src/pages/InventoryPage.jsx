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
  const [showBatchForm, setShowBatchForm] = useState(false)

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [selected, setSelected] = useState({})   // {id_code:true}
  const [targetCond, setTargetCond] = useState('') // '', 'good', 'rusak_ringan', 'rusak_berat'
  const [lastResult, setLastResult] = useState(null)
  const [qrId, setQrId] = useState(null)
  // Bulk delete UX state
  const [delLoading, setDelLoading] = useState(false)
  const [delProgress, setDelProgress] = useState({ done: 0, total: 0 })
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

  // --- GUARD: cegah refresh/close saat bulk delete berjalan
  useEffect(() => {
    if (!delLoading) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [delLoading])

  // --- GUARD: cegah navigasi in-app (klik link, tombol back) saat bulk delete
  useEffect(() => {
    if (!delLoading) return

    // 1) Blokir klik anchor/link
    const preventNavClick = (e) => {
      const el = e.target && e.target.closest ? e.target.closest('a[href]') : null
      if (el && el.getAttribute('href')) {
        e.preventDefault()
        e.stopPropagation()
        alert('Sedang menghapus item. Mohon tunggu hingga selesai.')
      }
    }
    document.addEventListener('click', preventNavClick, true)

    // 2) Tahan tombol back/forward dengan mendorong state dummy
    const onPopState = () => {
      try { window.history.pushState(null, '', window.location.href) } catch {}
      alert('Sedang menghapus item. Mohon tunggu hingga selesai.')
    }
    try { window.history.pushState(null, '', window.location.href) } catch {}
    window.addEventListener('popstate', onPopState)

    // 3) Cegah shortcut refresh (F5, Ctrl/Cmd+R) sebisanya
    const onKeyDown = (e) => {
      const k = (e.key || '').toLowerCase()
      if (k === 'f5' || ((k === 'r') && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        e.stopPropagation()
        alert('Sedang menghapus item. Mohon tunggu hingga selesai.')
      }
    }
    window.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('click', preventNavClick, true)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [delLoading])

  // --- IMPORTANT: reset selection setiap kali ganti page atau keyword search
  useEffect(() => {
    setSelected({})
  }, [page, q])

  // ===== selection utils =====
  const selectedIds = useMemo(() => Object.keys(selected), [selected])
  const selectedCount = selectedIds.length
  const allSelectedOnPage = items.length > 0 && items.every(it => selected[it.id_code])
  const roleLc = String(user?.role||'').toLowerCase()
  const canDelete = roleLc==='admin'

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
      setPrintAllLoading(false)
    }
  }

  // Trigger print ketika data siap
  useEffect(() => {
    if (printingAll && printAllList.length > 0) {
      const after = () => {
        setPrintingAll(false)
        setPrintAllList([])
        setPrintAllLoading(false)
      }
      window.addEventListener('afterprint', after)
      // beri waktu render sebelum memicu dialog print
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
  if (delLoading) return

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
    setDelLoading(true)
    setDelProgress({ done: 0, total: allowed.length })
    let done = 0
    for (const id of allowed) {
      try { await api.deleteItem(id) } catch (_) { /* lanjut item lain */ }
      done += 1
      setDelProgress(prev => ({ ...prev, done }))
    }
    setSelected({})
    await refresh({ keepPage: true })
    await loadSummary()
  } catch (e) {
    alert(e.message)
  } finally {
    setDelLoading(false)
    setDelProgress({ done: 0, total: 0 })
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

  // (Mark Lost moved to dropdown via bulk update condition)
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
          <a href="/inventory/lost" style={{ ...linkBtn, textDecoration:'none', display:'inline-block' }}>Lost Items</a>
        </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          {!showBatchForm ? (
            <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12, background: '#fafafa' }}>
              <button style={{ ...btn, borderColor: '#111' }} onClick={() => setShowBatchForm(true)}>+ Batch Item Registration</button>
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Klik untuk membuka form pendaftaran barang (batch)</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button style={btn} onClick={() => setShowBatchForm(false)}>Tutup</button>
              </div>
              <ItemForm onCreated={async () => { setShowBatchForm(false); await refresh({ keepPage: true }); await loadSummary() }} />
            </div>
          )}
        </div>

        {/* Ringkasan kategori (cepat) */}
        <CategorySummary data={catSummary} />

        <div>
          {/* toolbar pencarian */}
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKeyDownSearch}
              placeholder='Cari id/nama/kategori/model/rak/status...'
              style={ipt}
              disabled={delLoading}
            />
            <button onClick={doSearch} style={btn} disabled={delLoading}>Cari</button>
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
            <button onClick={() => setSelected({})} style={btn} disabled={delLoading}>Clear Selected</button>
            {canDelete && (
              <button
                onClick={deleteSelected}
                style={{ ...btn, borderColor: '#c1121f', color: '#c1121f', opacity: delLoading ? 0.6 : 1 }}
                disabled={selectedCount === 0 || delLoading}
                title={selectedCount ? (delLoading ? 'Sedang menghapus' : '') : 'Pilih item dulu'}
              >
                {delLoading ? `Deleting ${delProgress.done}/${delProgress.total}...` : 'Delete Selected'}
              </button>
            )}

            <button
              onClick={doPrintSelectedQr}
              style={{ ...btn, borderColor: '#111' }}
              disabled={selectedCount === 0 || delLoading}
              title={selectedCount ? (delLoading ? 'Sedang menghapus' : '') : 'Pilih item dulu'}
            >
              Cetak QR (Selected)
            </button>


            {roleLc !== 'operator' && (
              <>
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
              <option value="hilang">Hilang (Lost)</option>
            </select>
            <button
              onClick={applyBulkCondition}
              style={{ ...btn, borderColor: '#111' }}
              disabled={!targetCond || selectedCount === 0}  // ⬅️ guard di UI
            >
              Submit Perubahan
            </button>
              </>
            )}
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

      {printAllLoading && (
        <div
          className="noprint"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, flexDirection: 'column', textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>
            Menyiapkan QR…
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>Mohon tunggu, sedang memuat semua data dan label.</div>
        </div>
      )}

      {delLoading && (
        <div
          className="noprint"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, flexDirection: 'column', textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>
            Menghapus item… {delProgress.done} / {delProgress.total}
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>Mohon tunggu, jangan tutup halaman.</div>
        </div>
      )}
    </div>
  )
}
