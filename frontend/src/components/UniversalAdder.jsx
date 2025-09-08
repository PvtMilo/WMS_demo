import React, { useState, useRef } from 'react'
import { api } from '../api.js'

export default function UniversalAdder({ cid, onAdded }) {
  const [scanId, setScanId] = useState('')
  const [listIds, setListIds] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const scanRef = useRef(null)

  function parseIds() {
    const raw = [scanId, ...listIds.split(/\r?\n/)]
      .map(s => (s || '').trim())
      .filter(Boolean)
    return Array.from(new Set(raw))
  }

  async function submit(e){
    e.preventDefault()
    const ids = parseIds()
    if (!ids.length) { setMsg('Masukkan setidaknya 1 ID'); return }
    setLoading(true); setMsg('')
    try {
      const out = await api.addUniversalToContainer(cid, { ids })
      const c = out.added_counts || {}
      const s = out.skipped || []
      setMsg(`Batch ${out.batch}: +${(c.universal||0)} Universal. Skipped: ${s.length}`)
      setScanId('')
      scanRef.current?.focus()
      setListIds('')
      onAdded?.()
    } catch (e) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  const ipt = { 
    padding: 10, 
    border: '1px solid #d1d5db', 
    borderRadius: 8, 
    width: '100%',
    fontSize: 14,
  }

  return (
    <form onSubmit={submit} style={{
      display: 'grid', 
      gap: 16, 
      padding: 24, 
      background: 'white',
      border: '1px solid #e5e5e5', 
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color:'#fff' }}>U</div>
        <h3 style={{margin: 0, color: '#1f2937', fontSize: 20, fontWeight: 600}}>Universal Item Registration</h3>
      </div>

      <div style={{display: 'grid', gap: 12}}>
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>Scan ID (USB scanner)</span>
          <input 
            ref={scanRef} 
            autoFocus 
            value={scanId} 
            onChange={e=>setScanId(e.target.value)} 
            style={ipt} 
            placeholder="FRM-BOX-001" 
          />
        </label>
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>Input manual (satu ID per baris)</span>
          <textarea 
            value={listIds} 
            onChange={e=>setListIds(e.target.value)} 
            style={{...ipt, height:120, resize: 'vertical'}} 
            placeholder={"FRM-BOX-002\nFRM-BOX-003"}
          />
        </label>
      </div>

      <div style={{fontSize:13, color:'#374151', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:12}}>
        - De-dupe per kontainer (QR yang sama tidak akan dobel).<br/>
        - Tidak mengunci item (tidak ubah status global).<br/>
        - Auto-return saat kontainer ditutup.
      </div>

      <button 
        disabled={loading} 
        style={{
          padding: '12px 24px',
          border: 'none',
          borderRadius: 8,
          background: loading ? '#9ca3af' : '#3b82f6',
          color: 'white',
          fontWeight: 600,
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginTop: 8
        }}
      >
        {loading ? 'Menambahkan…' : 'Tambah Universal'}
      </button>

      {msg && (
        <div style={{
          padding: '12px 16px',
          background: msg.includes('Batch') ? '#eff6ff' : '#fef2f2',
          border: `1px solid ${msg.includes('Batch') ? '#bfdbfe' : '#fecaca'}`,
          borderRadius: 8,
          color: msg.includes('Batch') ? '#1e40af' : '#dc2626',
          fontSize: 14,
          fontWeight: 500
        }}>
          {msg}
        </div>
      )}
    </form>
  )
}

