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
      <div style={{display:'flex', alignItems:'baseline', gap:12, marginBottom: 16}}>
        <h2 style={{margin:0}}>Check-Out</h2>
        <span style={{color:'#666'}}>Total Open: <b>{total}</b></span>
      </div>
      <div style={{ 
        overflow: 'auto', 
        border: '1px solid #e5e5e5', 
        borderRadius: 12, 
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderBottom: '2px solid #e5e5e5'
            }}>
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
              items.map((c, index) => (
                <tr 
                  key={c.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white',
                    transition: 'background-color 0.2s ease',
                  }}
                  className="table-row-hover"
                >
                  <td style={tdMono}>{c.id}</td>
                  <td style={td}>{c.event_name}</td>
                  <td style={td}>{c.pic}</td>
                  <td style={td}>{c.crew || '-'}</td>
                  <td style={td}>{c.location || '-'}</td>
                  <td style={td}>{formatDateTime(c.start_date, {monthText:true})}</td>
                  <td style={td}>{formatDateTime(c.end_date, {monthText:true})}</td>
                  <td style={td}>
                    <a href={`/containers/${c.id}/checkout`} style={btnPrimary}>Buka</a>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td style={td} colSpan={8}>Tidak ada kontainer</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
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
const btnPrimary = { 
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
  transition: 'all 0.2s ease'
}
