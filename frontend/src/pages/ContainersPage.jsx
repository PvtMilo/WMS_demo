import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ContainerForm from '../components/ContainerForm.jsx'

export default function ContainersPage(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.listContainers(q ? { q } : {})
      setItems(res.data || [])
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ refresh() }, [])

  const ipt = {padding:8, border:'1px solid #ddd', borderRadius:8}
  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Kontainer / Event</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:24}}>
        <div><ContainerForm onCreated={() => refresh()} /></div>
        <div>
          <div style={{marginBottom:8, display:'flex', gap:8}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari id/event/pic/lokasi..." style={{...ipt, flex:1}}/>
            <button onClick={refresh} style={{padding:'8px 12px'}}>Cari</button>
          </div>
          {error && <div style={{color:'crimson'}}>{error}</div>}
          {loading ? 'Loading…' :
            <div style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#fafafa'}}>
                    <th style={th}>ID</th>
                    <th style={th}>Event</th>
                    <th style={th}>PIC</th>
                    <th style={th}>Lokasi</th>
                    <th style={th}>Jadwal</th>
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
                      <td style={td}>{(c.start_date||'-') + ' → ' + (c.end_date||'-')}</td>
                      <td style={td}>{c.status}</td>
                      <td style={td}><a href={`/containers/${c.id}/checkout`}>Buka</a></td>
                    </tr>
                  )):(
                    <tr><td style={td} colSpan={7}>Belum ada kontainer</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  )
}
const th = {textAlign:'left', padding:10, borderBottom:'1px solid #eee'}
const td = {padding:10, borderBottom:'1px solid #f2f2f2'}