// src/components/CategorySummary.jsx
import React, { useMemo } from 'react'

export default function CategorySummary({ data = [] }) {
  const totalUnits = useMemo(() => data.reduce((sum, item) => sum + Number(item?.qty || 0), 0), [data])

  if (!data.length) {
    return (
      <div style={wrap}>
        <div style={{ color: '#666' }}>Belum ada data.</div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>
        Ringkasan Kategori - Total: {totalUnits} pcs
      </div>
      <div style={grid}>
        {data.map((item) => (
          <div key={item.label} style={card}>
            <div style={title}>{item.label}</div>
            <div style={qty}>{item.qty} pcs</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const wrap = { border: '1px solid #eee', borderRadius: 12, padding: 12, background: '#fff', marginBottom: 12 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }
const card = { border: '1px solid #f0f0f0', borderRadius: 10, padding: '16px 18px', background: '#fafafa', display: 'grid', gap: 6 }
const title = { fontSize: 14, fontWeight: 600, color: '#1f2937' }
const qty = { fontSize: 13, fontWeight: 600, color: '#0f766e' }

