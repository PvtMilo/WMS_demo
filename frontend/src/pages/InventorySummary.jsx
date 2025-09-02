import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import '../styles/print.css'

export default function InventorySummary(){
  const [data, setData] = useState({ categories: [], grand_total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ts, setTs] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true); setError('')
    const now = new Date()
    setTs(now.toLocaleString('id-ID', { hour12: false }))
    api.inventorySummary()
      .then(r => { if (!mounted) return; setData({ categories: r.categories||[], grand_total: r.grand_total||0 }) })
      .catch(e => { if (!mounted) return; setError(e.message) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const wrap = { padding: 24, fontFamily: 'sans-serif' }
  const card = { border: '1px solid #eaeaea', borderRadius: 10, padding: 12, background: '#fff', marginBottom: 10, breakInside: 'avoid', pageBreakInside: 'avoid' }
  const th = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #eee', fontSize: 12, color:'#444' }
  const td = { padding: '6px 8px', borderBottom: '1px solid #f5f5f5', fontSize: 12 }
  const btn = { padding:'8px 12px', border:'1px solid #111', background:'#fff', borderRadius:8, cursor:'pointer' }
  const grid = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }

  if (loading) return <div style={{padding:24}}>Memuat…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>

  return (
    <div className="inv-summary" style={wrap}>
      <div className="noprint" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2 style={{margin:0}}>Stock Summary</h2>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => window.print()} style={btn}>Cetak</button>
        </div>
      </div>

      <div style={{marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
        <div style={{fontWeight:700}}>Total Semua: {data.grand_total} unit</div>
        <div style={{color:'#666', fontSize:12}}>Dicetak: {ts}</div>
      </div>

      <div className="grid" style={grid}>
        {data.categories.map(cat => (
          <div key={cat.category} className="card" style={card}>
            <div style={{fontSize:14, fontWeight:700, marginBottom:6}}>{cat.category} · {cat.total} unit</div>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#fafafa'}}>
                  <th style={th}>Nama</th>
                  <th style={th}>Model</th>
                  <th style={{...th, textAlign:'right'}}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {(cat.models||[]).map((m, i) => (
                  <tr key={i}>
                    <td style={td}>{m.name || '-'}</td>
                    <td style={td}>{m.model || '-'}</td>
                    <td style={{...td, textAlign:'right'}}>{m.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
