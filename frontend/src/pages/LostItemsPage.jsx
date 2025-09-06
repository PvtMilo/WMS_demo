import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const PER_PAGE = 100

export default function LostItemsPage(){
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh(p = page){
    setLoading(true); setError('')
    try{
      const res = await api.listItems({ q: 'Hilang', page: p, per_page: PER_PAGE })
      const onlyLost = (res.data || []).filter(it => String(it.status||'').toLowerCase()==='hilang')
      setItems(onlyLost)
      setTotal(res.total || onlyLost.length)
      setPage(res.page || p)
    }catch(e){ setError(e.message) } finally { setLoading(false) }
  }

  useEffect(()=>{ refresh(1) },[])

  const btn = { padding:'6px 10px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2' }
  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Lost Items</h2>
      <div style={{margin:'8px 0 12px', display:'flex', gap:8}}>
        <a href="/inventory" style={{...btn, textDecoration:'none', display:'inline-block'}}>← Back to Inventory</a>
      </div>
      {error && <div style={{color:'crimson'}}>{error}</div>}
      {loading ? 'Loading…' : (
        <div style={{ overflow:'auto', border:'1px solid #eee', borderRadius:12 }}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fafafa'}}>
                <th style={th}>ID</th>
                <th style={th}>Nama</th>
                <th style={th}>Model</th>
                <th style={th}>Rak</th>
                <th style={th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td style={td} colSpan={5}>— Tidak ada item hilang —</td></tr>
              ) : items.map(it => (
                <tr key={it.id_code}>
                  <td style={td}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>
                    <button
                      style={btn}
                      onClick={async ()=>{
                        try{
                          const ctx = await api.lostContext(it.id_code)
                          window.location.href = `/containers/${ctx.container_id}/checkin`
                        }catch(e){ alert(e.message) }
                      }}
                    >Track</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > PER_PAGE && (
        <div style={{ marginTop:12, display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <button style={btn} disabled={page===1} onClick={()=>{ setPage(1); refresh(1) }}>First</button>
          <button style={btn} disabled={page===1} onClick={()=>{ const p=Math.max(1,page-1); setPage(p); refresh(p) }}>Prev</button>
          <span>Page {page}</span>
          <button style={btn} onClick={()=>{ const p=page+1; setPage(p); refresh(p) }}>Next</button>
        </div>
      )}
    </div>
  )
}
