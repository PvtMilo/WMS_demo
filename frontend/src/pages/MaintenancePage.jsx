import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

export default function MaintenancePage(){
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 50
  const [hist, setHist] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [actions, setActions] = useState({}) // { [id_code]: { action:'', note:'' } }
  const [counts, setCounts] = useState({ ringan: 0, berat: 0 })

  async function refresh(){
    setLoading(true); setError('')
    try {
      const res = await api.maintenanceList({ q, page, per_page: perPage })
      setList(res.data || [])
      setTotal(res.total || 0)
      setCounts(res.counts || { ringan: 0, berat: 0 })
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function loadHistory(){
    setHistLoading(true)
    try {
      const r = await api.repairHistory({ limit: 200 })
      setHist(r.data || [])
    } catch { /* ignore */ }
    finally { setHistLoading(false) }
  }

  useEffect(() => { refresh(); loadHistory() }, [])
  useEffect(() => { refresh() }, [page])

  function setRowAction(id_code, patch){
    setActions(prev => ({ ...prev, [id_code]: { action:'', note:'', ...(prev[id_code]||{}), ...patch } }))
  }
  async function applyRowAction(id_code){
    const st = actions[id_code] || { action:'', note:'' }
    const a = (st.action || '').toLowerCase()
    if (!a) { alert('Pilih aksi terlebih dahulu'); return }
    const note = (st.note || '').trim()
    if (!note) { alert('Catatan penanganan wajib diisi'); return }
    const target = a === 'ringan' ? 'rusak_ringan' : a
    try {
      await api.repairItem(id_code, note, target)
      setRowAction(id_code, { action:'', note:'' })
      await refresh(); await loadHistory()
    } catch (e) { alert(e.message) }
  }

  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2', verticalAlign:'top' }
  const btn = { padding:'6px 10px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8 }

  const filtered = useMemo(() => list, [list])
  const pages = Math.max(1, Math.ceil((total || 0) / perPage))
  const actionBtn = (id_code) => {
    const st = actions[id_code] || { action:'', note:'' }
    const disabled = !st.action || !(st.note||'').trim()
    return <button onClick={()=>applyRowAction(id_code)} style={{...btn, borderColor:'#0a7', color:'#0a7'}} disabled={disabled}>Apply</button>
  }
  function optionsFor(it){
    const opts = [
      { v:'', label:'-- pilih aksi --' },
      { v:'good', label:'Perbaiki → Good' },
    ]
    if (it.defect_level === 'berat') opts.push({ v:'ringan', label:'Jadikan Rusak ringan' })
    opts.push({ v:'broken', label:'Tandai Broken (Afkir)' })
    return opts
  }

  return (
    <div style={{ padding:24, fontFamily:'sans-serif' }}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
        <h2 style={{margin:0}}>Maintenance</h2>
        <a href="/inventory" style={{fontSize:13}}>Ke Inventory »</a>
      </div>
      <div className="noprint" style={{display:'flex', gap:12, alignItems:'center', margin:'8px 0 12px', flexWrap:'wrap'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari id/nama/kategori/model/rak..." style={{...ipt, flex:1}} />
        <button onClick={refresh} style={btn}>Cari</button>
        <div style={{marginLeft:'auto', color:'#333'}}>
          <span style={{background:'#fff9c4', padding:'4px 8px', borderRadius:6, border:'1px solid #eee'}}>Ringan: <b>{counts.ringan}</b></span>
          <span style={{marginLeft:8, background:'#ffebee', padding:'4px 8px', borderRadius:6, border:'1px solid #eee'}}>Berat: <b>{counts.berat}</b></span>
        </div>
      </div>

      {error && <div style={{color:'crimson'}}>{error}</div>}
      {loading ? 'Memuat…' : (
        <div style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden', marginBottom:16}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fafafa'}}>
                <th style={th}>ID</th>
                <th style={th}>Nama</th>
                <th style={th}>Kategori</th>
                <th style={th}>Model</th>
                <th style={th}>Rak</th>
                <th style={th}>Level</th>
                <th style={th}>Kerusakan Terakhir</th>
                <th style={th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(it => (
                <tr key={it.id_code} style={rowStyleMaint(it)}>
                  <td style={td}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.category}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{it.defect_level}</td>
                  <td style={td}>{it.last_damage_note || '-'}</td>
                  <td style={td}>
                    <div style={{display:'grid', gap:6}}>
                      <select
                        value={(actions[it.id_code]?.action)||''}
                        onChange={e=>setRowAction(it.id_code, { action:e.target.value })}
                        style={{...ipt, minWidth:220}}
                      >
                        {optionsFor(it).map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                      </select>
                      {(actions[it.id_code]?.action) && actions[it.id_code].action !== 'delete' && (
                        <input
                          placeholder="Catatan penanganan (wajib)"
                          value={(actions[it.id_code]?.note)||''}
                          onChange={e=>setRowAction(it.id_code, { note:e.target.value })}
                          style={ipt}
                        />
                      )}
                      {actionBtn(it.id_code)}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td style={td} colSpan={8}>Tidak ada barang Rusak</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:16 }}>
        <button style={btn} disabled={page<=1} onClick={()=>setPage(1)}>First</button>
        <button style={btn} disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <span>Hal {page} / {pages}</span>
        <button style={btn} disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Next</button>
        <button style={btn} disabled={page>=pages} onClick={()=>setPage(pages)}>Last</button>
      </div>

      <div style={{marginTop:8}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <h3 style={{margin:'8px 0'}}>History Perbaikan (terbaru)</h3>
          <button className="noprint" onClick={loadHistory} style={btn} disabled={histLoading}>{histLoading ? 'Muat…' : 'Refresh'}</button>
        </div>
        <div style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fafafa'}}>
                <th style={th}>Waktu</th>
                <th style={th}>ID</th>
                <th style={th}>Nama</th>
                <th style={th}>Kategori</th>
                <th style={th}>Model</th>
                <th style={th}>Status Sebelumnya</th>
                <th style={th}>Status Sekarang</th>
                <th style={th}>Kerusakan</th>
                <th style={th}>Penanganan / Hasil</th>
              </tr>
            </thead>
            <tbody>
              {hist.length ? hist.map((r,i) => (
                <tr key={r.id + '-' + i} style={rowStyleHist(r)}>
                  <td style={td}>{r.repaired_at}</td>
                  <td style={td}>{r.id_code}</td>
                  <td style={td}>{r.name || '-'}</td>
                  <td style={td}>{r.category || '-'}</td>
                  <td style={td}>{r.model || '-'}</td>
                  <td style={td}>{formatStatusPrev(r)}</td>
                  <td style={td}>{formatStatusNow(r)}</td>
                  <td style={td}>{r.last_damage_note || '-'}</td>
                  <td style={td}>
                    <div>{r.repair_note}</div>
                    <div style={{fontSize:12, color:'#666', marginTop:4}}>Hasil: {r.result_status || '-'}{r.result_status==='Rusak' && r.result_defect ? ` (${r.result_defect})` : ''}</div>
                  </td>
                </tr>
              )) : (
                <tr><td style={td} colSpan={9}>Belum ada history</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function rowStyleMaint(it){
  if (it.defect_level === 'ringan') return { background:'#fff9c4' }
  if (it.defect_level === 'berat') return { background:'#ffebee' }
  return {}
}
function rowStyleHist(r){
  if (r.result_status === 'Good') return { background:'#e6ffed' }
  if (r.result_status === 'Rusak'){
    if (r.result_defect === 'ringan') return { background:'#fff9c4' }
    if (r.result_defect === 'berat') return { background:'#ffebee' }
  }
  if (r.result_status === 'Afkir') return { background:'#eeeeee' }
  return {}
}

function formatStatusPrev(r){
  const st = r.status_before || '-'
  if (st === 'Rusak'){
    const d = r.defect_before || ''
    return d ? `${st} (${d})` : st
  }
  return st || '-'
}
function formatStatusNow(r){
  const st = r.result_status || '-'
  if (st === 'Rusak'){
    const d = r.result_defect || ''
    return d ? `${st} (${d})` : st
  }
  return st || '-'
}
