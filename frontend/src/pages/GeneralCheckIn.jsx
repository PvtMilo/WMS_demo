import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'

export default function GeneralCheckIn(){
  const [scanCode, setScanCode] = useState('')
  const [rows, setRows] = useState([]) // { id_code, name, event_name, pic, container_id, ts }
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [busy, setBusy] = useState(false)
  const scanRef = useRef(null)
  const lastScanRef = useRef({ code: '', at: 0 })

  useEffect(()=>{ scanRef.current?.focus() }, [])

  function resetFocus(){
    setScanCode('')
    // allow next tick so value clears before focusing
    requestAnimationFrame(()=> scanRef.current?.focus())
  }

  function handleKeyDown(e){
    if (e.key === 'Enter') {
      e.preventDefault()
      doScan()
    }
  }

  async function doScan(){
    const code = (scanCode || '').trim()
    if (!code || busy) { resetFocus(); return }

    // De-dupe rapid re-scan within 1500ms
    const now = Date.now()
    const last = lastScanRef.current
    if (last.code === code && (now - last.at) < 1500) { resetFocus(); return }
    lastScanRef.current = { code, at: now }

    setBusy(true)
    try{
      // 1) Verify item exists (for user-friendly error: "Item tidak dikenal")
      let item
      try {
        item = await api.getItem(code)
      } catch (e) {
        alert('Item tidak dikenal')
        return
      }

      // 2) Resolve active container context
      let ctx
      try {
        ctx = await api.lostContext(code)
      } catch (e) {
        alert('Item tidak dalam kondisi out')
        return
      }

      // Must be actively OUT: returned_at must be null/empty and not lost/hilang
      const returnedAt = (ctx.returned_at || '').trim()
      const rc = String(ctx.return_condition || '').toLowerCase()
      if (returnedAt || rc === 'hilang'){
        alert('Item tidak dalam kondisi out')
        return
      }

      const cid = ctx.container_id
      if (!cid){
        alert('Item tidak dalam kondisi out')
        return
      }

      // 3) Perform check-in on the related container
      try {
        await api.checkinItem(cid, { id_code: code, condition: 'good' })
      } catch (e) {
        alert(e.message || 'Gagal check-in')
        return
      }

      // 4) Append to session table (newest on top)
      const row = {
        id_code: code,
        name: item?.name || code,
        event_name: ctx.event_name || '-',
        pic: ctx.pic || '-',
        container_id: cid,
        ts: Date.now(),
      }
      setRows(prev => [row, ...prev])
      // Keep current page at 1 to show newest first by default
      setPage(1)
    } finally {
      setBusy(false)
      resetFocus()
    }
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const paged = useMemo(()=>{
    const start = (pageSafe - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, pageSafe, pageSize])

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
  const btn = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    background: '#F2C14E',
    color: 'white',
    fontWeight: 500,
    fontSize: 12,
    textDecoration: 'none',
    display: 'inline-block',
    cursor: 'pointer',
  }

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', alignItems:'baseline', gap:12, marginBottom: 16}}>
        <h2 style={{margin:0}}>General Check-In</h2>
        <span style={{color:'#666'}}>Scan item OUT untuk dikembalikan</span>
      </div>

      {/* Scanner input */}
      <div style={{
        marginBottom: 16,
        background: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <label style={{display:'grid', gap:6}}>
          <span style={{fontWeight: 600, color: '#374151', fontSize: 14}}>Scan QR</span>
          <input
            ref={scanRef}
            value={scanCode}
            onChange={e=>setScanCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Fokus disini lalu scan QR"
            disabled={busy}
            style={{
              padding: 10,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              width: '100%',
              fontSize: 14
            }}
          />
        </label>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <button onClick={doScan} disabled={busy} style={{padding:'8px 12px', border:'none', borderRadius:6, background:'#059669', color:'white', fontWeight:600}}>
            {busy ? 'Memproses...' : 'Check-In'}
          </button>
          <button onClick={()=>{ setRows([]); setPage(1); scanRef.current?.focus() }} style={{padding:'8px 12px', border:'1px solid #ddd', borderRadius:6, background:'white'}}>
            Delete All
          </button>
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:12, color:'#666'}}>Per halaman:</span>
            <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value)||25); setPage(1) }} style={{padding:'6px 8px', border:'1px solid #ddd', borderRadius:6}}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returned items table */}
      <div style={{
        overflow: 'auto',
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '2px solid #e5e5e5' }}>
              <th style={th}>Nama Item</th>
              <th style={th}>Event</th>
              <th style={th}>PIC</th>
              <th style={th}>Container ID</th>
              <th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.length ? paged.map((r, idx)=> (
              <tr key={r.ts + '-' + r.id_code} style={{ backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white' }}>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.event_name}</td>
                <td style={td}>{r.pic}</td>
                <td style={tdMono}>{r.container_id}</td>
                <td style={td}><a href={`/containers/${r.container_id}/checkin`} style={btn}>Buka</a></td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={5}>Belum ada item yang dikembalikan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
        <button onClick={()=>{ setPage(p=>Math.max(1, p-1)); scanRef.current?.focus() }} disabled={pageSafe <= 1} style={{padding:'6px 10px', border:'1px solid #ddd', borderRadius:6, background:'white'}}>Previous</button>
        <span style={{fontSize:13, color:'#555'}}>Page {pageSafe} / {totalPages}</span>
        <button onClick={()=>{ setPage(p=>Math.min(totalPages, p+1)); scanRef.current?.focus() }} disabled={pageSafe >= totalPages} style={{padding:'6px 10px', border:'1px solid #ddd', borderRadius:6, background:'white'}}>Next</button>
        <div style={{marginLeft:'auto', fontSize:12, color:'#666'}}>Total: {rows.length}</div>
      </div>
    </div>
  )
}

