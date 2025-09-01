import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ContainerForm from '../components/ContainerForm.jsx'
import { formatDateTime } from '../utils/date.js'

export default function ContainersPage(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 20

  async function refresh(p = page){
    setLoading(true); setError('')
    try{
      const params = { page: p, per_page: perPage }
      if (q) params.q = q
      const res = await api.listContainers(params)
      setItems(res.data || [])
      setTotal(res.total || 0)
      setPage(res.page || p)
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ refresh(page) }, [page])

  const ipt = {padding:8, border:'1px solid #ddd', borderRadius:8}
  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Kontainer</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:24}}>
        <div><ContainerForm onCreated={() => refresh(1)} /></div>
        <div>
          <div style={{marginBottom:8, display:'flex', gap:8}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari id/event/pic/lokasi..." style={{...ipt, flex:1}}/>
            <button onClick={()=>{setPage(1); refresh(1)}} style={{padding:'8px 12px'}}>Cari</button>
          </div>
          {error && <div style={{color:'crimson'}}>{error}</div>}
          {loading ? 'Loading…' : (
            <div>
              <div style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#fafafa'}}>
                      <th style={th}>ID</th>
                      <th style={th}>Event</th>
                      <th style={th}>PIC</th>
                      <th style={th}>Lokasi</th>
                      <th style={th}>Mulai</th>
                      <th style={th}>Selesai</th>
                      <th style={th}>Status</th>
                      <th style={th}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length ? items.map((c)=>(
                      <tr key={c.id}>
                        <td style={td}>{c.id}</td>
                        <td style={td}>{c.event_name}</td>
                        <td style={td}>{c.pic}</td>
                        <td style={td}>{c.location || '-'}</td>
                        <td style={td}>{formatDateTime(c.start_date, {monthText:true})}</td>
                        <td style={td}>{formatDateTime(c.end_date, {monthText:true})}</td>
                        <td style={td}>{c.status}</td>
                        <td style={td}>{c.status === 'Open' ? <a href={`/containers/${c.id}/checkout`}>Buka</a> : '-'}</td>
                      </tr>
                    )):(
                      <tr><td style={td} colSpan={8}>Belum ada kontainer</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{padding:'6px 12px'}}>Prev</button>
                <div>Hal {page} / {Math.max(1, Math.ceil(total / perPage))}</div>
                <button disabled={page>=Math.ceil(total/perPage)} onClick={()=>setPage(p=>p+1)} style={{padding:'6px 12px'}}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
const th = {textAlign:'left', padding:10, borderBottom:'1px solid #eee'}
const td = {padding:10, borderBottom:'1px solid #f2f2f2'}
