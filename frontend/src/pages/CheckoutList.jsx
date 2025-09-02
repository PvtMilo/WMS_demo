import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatDateTime } from '../utils/date.js'

export default function CheckoutList(){
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    let mounted = true
    setLoading(true); setError('')
    api.listContainers({status:'Open', per_page:100})
      .then(r=>{ if (!mounted) return; setItems(r.data||[]); setTotal(r.total||0) })
      .catch(e=>{ if (!mounted) return; setError(e.message) })
      .finally(()=>{ if (mounted) setLoading(false) })
    return () => { mounted = false }
  },[])

  if (loading) return <div style={{padding:24}}>Loading…</div>
  if (error) return <div style={{padding:24,color:'crimson'}}>{error}</div>

  return (
    <div style={{padding:24,fontFamily:'sans-serif'}}>
      <div style={{display:'flex', alignItems:'baseline', gap:12}}>
        <h2 style={{margin:0}}>Check-Out</h2>
        <span style={{color:'#666'}}>Total Open: <b>{total}</b></span>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse', marginTop:8}}>
        <thead>
          <tr style={{background:'#fafafa'}}>
            <th style={th}>ID</th>
            <th style={th}>Event</th>
            <th style={th}>PIC</th>
            <th style={th}>Crew</th>
            <th style={th}>Lokasi</th>
            <th style={th}>Mulai</th>
            <th style={th}>Selesai</th>
            <th style={th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map(c => (
              <tr key={c.id}>
                <td style={td}>{c.id}</td>
                <td style={td}>{c.event_name}</td>
                <td style={td}>{c.pic}</td>
                <td style={td}>{c.crew || '-'}</td>
                <td style={td}>{c.location || '-'}</td>
                <td style={td}>{formatDateTime(c.start_date, {monthText:true})}</td>
                <td style={td}>{formatDateTime(c.end_date, {monthText:true})}</td>
                <td style={td}><a href={`/containers/${c.id}/checkout`}>Buka</a></td>
              </tr>
            ))
          ) : (
            <tr><td style={td} colSpan={8}>Tidak ada kontainer</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
const th={textAlign:'left',padding:10,borderBottom:'1px solid #eee'}
const td={padding:10,borderBottom:'1px solid #f2f2f2'}
