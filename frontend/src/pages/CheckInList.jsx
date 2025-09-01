import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatDateTime } from '../utils/date.js'

export default function CheckInList(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(()=>{
    api.listContainers({status:'Open', per_page:100}).then(r=>setItems(r.data||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  if (loading) return <div style={{padding:24}}>Loading…</div>
  if (error) return <div style={{padding:24,color:'crimson'}}>{error}</div>
  return (
    <div style={{padding:24,fontFamily:'sans-serif'}}>
      <h2>Check-In</h2>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead>
          <tr style={{background:'#fafafa'}}>
            <th style={th}>ID</th>
            <th style={th}>Event</th>
            <th style={th}>PIC</th>
            <th style={th}>Crew</th>
            <th style={th}>Lokasi</th>
            <th style={th}>Jadwal</th>
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
                <td style={td}>{formatDateTime(c.start_date, {monthText:true}) + ' → ' + formatDateTime(c.end_date, {monthText:true})}</td>
                <td style={td}><a href={`/containers/${c.id}/checkin`}>Buka</a></td>
              </tr>
            ))
          ) : (
            <tr><td style={td} colSpan={7}>Tidak ada kontainer</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
const th={textAlign:'left',padding:10,borderBottom:'1px solid #eee'}
const td={padding:10,borderBottom:'1px solid #f2f2f2'}
