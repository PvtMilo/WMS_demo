// src/components/CategorySummary.jsx
import React, { useMemo } from 'react'

export default function CategorySummary({ data = [] }) {
  const totalUnits = useMemo(() => data.reduce((sum, cat) => sum + Number(cat.total || 0), 0), [data])

  if (!data.length) {
    return (
      <div style={wrap}>
        <div style={{ color:'#666' }}>Belum ada data kategori.</div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={{marginBottom:8, fontWeight:700}}>
        Ringkasan Kategori - Total: {totalUnits} unit
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12}}>
        {data.map((cat) => (
          <div key={cat.category} style={card}>
            <div style={{fontSize:13, color:'#666', marginBottom:6}}>{cat.category}</div>
            <div style={{fontSize:18, fontWeight:700, marginBottom:8}}>{cat.total} unit</div>
            <ul style={list}>
              {(cat.items || []).map((item, idx) => (
                <li key={`${cat.category}-${idx}`} style={listItem}>
                  <span>{item.label}</span>
                  <span style={{ color:'#0f766e', fontWeight:600 }}>qty {item.qty}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

const wrap = { border:'1px solid #eee', borderRadius:12, padding:12, background:'#fff', marginBottom:12 }
const card = { border:'1px solid #f0f0f0', borderRadius:10, padding:'12px 14px', background:'#fafafa', display:'grid', gap:6 }
const list = { listStyle:'none', margin:0, padding:0, display:'grid', gap:4 }
const listItem = { display:'flex', justifyContent:'space-between', fontSize:13, color:'#334155' }

