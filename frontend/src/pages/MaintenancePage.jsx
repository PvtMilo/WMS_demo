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
  
  // Modern table styles
  const thModern = { 
    textAlign: 'left', 
    padding: '14px 12px', 
    borderBottom: '2px solid #e5e5e5', 
    whiteSpace: 'nowrap',
    fontWeight: 600,
    fontSize: 14,
    color: '#374151'
  }
  const tdModern = { 
    padding: '12px', 
    borderBottom: '1px solid #f1f5f9', 
    verticalAlign: 'top',
    fontSize: 14,
    color: '#1f2937'
  }
  const tdMono = { 
    ...tdModern, 
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontWeight: 600,
    color: '#4f46e5'
  }

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
        <div style={{ 
          overflow: 'auto', 
          border: '1px solid #e5e5e5', 
          borderRadius: 12, 
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginBottom: 16
        }}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #e5e5e5'
              }}>
                <th style={thModern}>ID</th>
                <th style={thModern}>Nama</th>
                <th style={thModern}>Kategori</th>
                <th style={thModern}>Model</th>
                <th style={thModern}>Rak</th>
                <th style={thModern}>Level</th>
                <th style={thModern}>Kerusakan Terakhir</th>
                <th style={thModern}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(it => (
                <tr key={it.id_code} style={rowStyleMaintModern(it)}>
                  <td style={tdMono}>{it.id_code}</td>
                  <td style={tdModern}>{it.name}</td>
                  <td style={tdModern}>{it.category}</td>
                  <td style={tdModern}>{it.model}</td>
                  <td style={tdModern}>{it.rack}</td>
                  <td style={tdModern}>{it.defect_level}</td>
                  <td style={tdModern}>{it.last_damage_note || '-'}</td>
                  <td style={tdModern}>
                    <div style={{display:'grid', gap:6}}>
                      <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <select
                          value={(actions[it.id_code]?.action)||''}
                          onChange={e=>setRowAction(it.id_code, { action:e.target.value })}
                          style={{...ipt, width: 140}}
                        >
                          {optionsFor(it).map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                        {actionBtn(it.id_code)}
                      </div>
                      {(actions[it.id_code]?.action) && actions[it.id_code].action !== 'delete' && (
                        <input
                          placeholder="Catatan penanganan (wajib)"
                          value={(actions[it.id_code]?.note)||''}
                          onChange={e=>setRowAction(it.id_code, { note:e.target.value })}
                          style={ipt}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td style={tdModern} colSpan={8}>Tidak ada barang Rusak</td></tr>
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
        <div style={{ 
          overflow: 'auto', 
          border: '1px solid #e5e5e5', 
          borderRadius: 12, 
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #e5e5e5'
              }}>
                <th style={thModern}>Waktu</th>
                <th style={thModern}>ID</th>
                <th style={thModern}>Nama</th>
                <th style={thModern}>Kategori</th>
                <th style={thModern}>Model</th>
                <th style={thModern}>Status Sebelumnya</th>
                <th style={thModern}>Status Sekarang</th>
                <th style={thModern}>Kerusakan</th>
                <th style={thModern}>Penanganan / Hasil</th>
              </tr>
            </thead>
            <tbody>
              {hist.length ? hist.map((r,i) => (
                <tr key={r.id + '-' + i} style={rowStyleHistModern(r, i)}>
                  <td style={tdModern}>{r.repaired_at}</td>
                  <td style={tdMono}>{r.id_code}</td>
                  <td style={tdModern}>{r.name || '-'}</td>
                  <td style={tdModern}>{r.category || '-'}</td>
                  <td style={tdModern}>{r.model || '-'}</td>
                  <td style={tdModern}>{formatStatusPrev(r)}</td>
                  <td style={tdModern}>{formatStatusNow(r)}</td>
                  <td style={tdModern}>{r.last_damage_note || '-'}</td>
                  <td style={tdModern}>
                    <div>{r.repair_note}</div>
                    <div style={{fontSize:12, color:'#666', marginTop:4}}>Hasil: {r.result_status || '-'}{r.result_status==='Rusak' && r.result_defect ? ` (${r.result_defect})` : ''}</div>
                  </td>
                </tr>
              )) : (
                <tr><td style={tdModern} colSpan={9}>Belum ada history</td></tr>
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

// Modern row styles that preserve business logic
function rowStyleMaintModern(it){
  const baseStyle = {
    transition: 'background-color 0.2s ease',
  }
  
  // Business logic: defect level colors
  if (it.defect_level === 'ringan') return { ...baseStyle, background:'#fff9c4' }
  if (it.defect_level === 'berat') return { ...baseStyle, background:'#ffebee' }
  
  // Default alternating colors for items without defect levels
  return baseStyle
}

function rowStyleHistModern(r, index){
  const baseStyle = {
    transition: 'background-color 0.2s ease',
  }
  
  // Business logic: result status colors (higher priority than alternating)
  if (r.result_status === 'Good') return { ...baseStyle, background:'#e6ffed' }
  if (r.result_status === 'Rusak'){
    if (r.result_defect === 'ringan') return { ...baseStyle, background:'#fff9c4' }
    if (r.result_defect === 'berat') return { ...baseStyle, background:'#ffebee' }
  }
  if (r.result_status === 'Afkir') return { ...baseStyle, background:'#eeeeee' }
  
  // Default alternating colors for other statuses
  return {
    ...baseStyle,
    backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white'
  }
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
