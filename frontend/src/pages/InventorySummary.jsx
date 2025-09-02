import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import '../styles/print.css'

export default function InventorySummary(){
  const [data, setData] = useState({ categories: [], grand_total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true); setError('')
    api.inventorySummary()
      .then(r => { if (!mounted) return; setData({ categories: r.categories||[], grand_total: r.grand_total||0 }) })
      .catch(e => { if (!mounted) return; setError(e.message) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const wrap = { padding: 24, fontFamily: 'sans-serif' }
  const card = { border: '1px solid #eee', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }
  const th = { textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }
  const td = { padding: 8, borderBottom: '1px solid #f7f7f7' }
  const btn = { padding:'8px 12px', border:'1px solid #111', background:'#fff', borderRadius:8, cursor:'pointer' }

  if (loading) return <div style={{padding:24}}>Memuat…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>

  return (
    <div style={wrap}>
      <div className="noprint" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2 style={{margin:0}}>Stock Summary</h2>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => window.print()} style={btn}>Cetak</button>
        </div>
      </div>

      <div style={{marginBottom:12, fontWeight:700}}>Total Semua: {data.grand_total} unit</div>

      {data.categories.map(cat => (
        <div key={cat.category} style={card}>
          <div style={{fontSize:16, fontWeight:700, marginBottom:8}}>{cat.category} · Total: {cat.total} unit</div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fafafa'}}>
                <th style={th}>Nama</th>
                <th style={th}>Model</th>
                <th style={th}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(cat.models||[]).map((m, i) => (
                <tr key={i}>
                  <td style={td}>{m.name || '-'}</td>
                  <td style={td}>{m.model || '-'}</td>
                  <td style={td}>{m.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

