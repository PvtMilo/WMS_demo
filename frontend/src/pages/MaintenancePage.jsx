import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

export default function MaintenancePage(){
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [hist, setHist] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  async function refresh(){
    setLoading(true); setError('')
    try {
      const res = await api.maintenanceList({ q })
      setList(res.data || [])
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

  async function doRepair(id_code){
    const note = prompt(`Penanganan untuk ${id_code} (wajib):`, '')
    if (!note || !note.trim()) return alert('Catatan penanganan wajib diisi')
    try {
      await api.repairItem(id_code, note.trim())
      await refresh(); await loadHistory()
    } catch (e) { alert(e.message) }
  }

  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2', verticalAlign:'top' }
  const btn = { padding:'6px 10px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8 }

  const filtered = useMemo(() => list, [list])

  return (
    <div style={{ padding:24, fontFamily:'sans-serif' }}>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
        <h2 style={{margin:0}}>Maintenance</h2>
        <a href="/inventory" style={{fontSize:13}}>Ke Inventory »</a>
      </div>
      <div className="noprint" style={{display:'flex', gap:8, alignItems:'center', margin:'8px 0 12px'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari id/nama/kategori/model/rak..." style={{...ipt, flex:1}} />
        <button onClick={refresh} style={btn}>Cari</button>
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
                <tr key={it.id_code}>
                  <td style={td}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.category}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{it.defect_level}</td>
                  <td style={td}>{it.last_damage_note || '-'}</td>
                  <td style={td}>
                    <button onClick={()=>doRepair(it.id_code)} style={btn}>Tandai Repaired → Good</button>
                  </td>
                </tr>
              )) : (
                <tr><td style={td} colSpan={8}>Tidak ada barang Rusak</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
                <th style={th}>Level Sebelumnya</th>
                <th style={th}>Kerusakan</th>
                <th style={th}>Penanganan</th>
              </tr>
            </thead>
            <tbody>
              {hist.length ? hist.map((r,i) => (
                <tr key={r.id + '-' + i}>
                  <td style={td}>{r.repaired_at}</td>
                  <td style={td}>{r.id_code}</td>
                  <td style={td}>{r.name || '-'}</td>
                  <td style={td}>{r.category || '-'}</td>
                  <td style={td}>{r.model || '-'}</td>
                  <td style={td}>{r.defect_before || '-'}</td>
                  <td style={td}>{r.last_damage_note || '-'}</td>
                  <td style={td}>{r.repair_note}</td>
                </tr>
              )) : (
                <tr><td style={td} colSpan={8}>Belum ada history</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

