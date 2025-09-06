import React, { useState, useRef } from 'react'
import { api } from '../api.js'

export default function CheckoutAdder({ cid, onAdded }) {
  const [scanId, setScanId] = useState('')
  const [listIds, setListIds] = useState('')
  const [amend, setAmend] = useState(false)
  const [amendReason, setAmendReason] = useState('')
  const [overrideHeavy, setOverrideHeavy] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideLight, setOverrideLight] = useState(false)
  const [overrideLightReason, setOverrideLightReason] = useState('')
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
    if (amend && !amendReason.trim()) {
      setMsg('Alasan amend wajib diisi saat centang Amend'); return
    }
    if (overrideHeavy && !overrideReason.trim()) {
      setMsg('Alasan override untuk rusak berat wajib diisi'); return
    }
    if (overrideLight && !overrideLightReason.trim()) {
      setMsg('Alasan override untuk rusak ringan wajib diisi'); return
    }
    setLoading(true); setMsg('')
    try {
      const out = await api.addItemsToContainer(cid, {
        ids, amend, amend_reason: amend ? amendReason : undefined,
        override_heavy: overrideHeavy, override_reason: overrideReason,
        override_light: overrideLight, override_light_reason: overrideLightReason
      })
      const c = out.added_counts || {}
      const s = out.skipped || []
      setMsg(`Batch ${out.batch}: +${(c.good||0)} Good, +${(c.rusak_ringan||0)} Ringan, +${(c.rusak_berat||0)} Berat. Skipped: ${s.length}`)
      setScanId('')
      scanRef.current?.focus()
      setListIds('')
      setAmendReason('')
      setOverrideHeavy(false)
      setOverrideReason('')
      setOverrideLight(false)
      setOverrideLightReason('')
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
    transition: 'border-color 0.2s ease',
    ':focus': {
      borderColor: '#F2C14E',
      outline: 'none'
    }
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8
      }}>
        <div style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(135deg, #F2C14E 0%, #e6b800 100%)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18
        }}>
          📦
        </div>
        <h3 style={{margin: 0, color: '#1f2937', fontSize: 20, fontWeight: 600}}>
          Checkout / Tambah Barang
        </h3>
      </div>
      <div style={{display: 'grid', gap: 12}}>
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
            🔍 Scan ID (USB scanner)
          </span>
          <input 
            ref={scanRef} 
            autoFocus 
            value={scanId} 
            onChange={e=>setScanId(e.target.value)} 
            style={ipt} 
            placeholder="CAM-70D-001" 
          />
        </label>
        
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
            ✏️ Input manual (satu ID per baris)
          </span>
          <textarea 
            value={listIds} 
            onChange={e=>setListIds(e.target.value)} 
            style={{...ipt, height:120, resize: 'vertical'}} 
            placeholder="CAM-70D-002&#10;CAM-70D-003"
          />
        </label>
      </div>

      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 12,
        padding: 16,
        background: '#f8f9fa',
        borderRadius: 8,
        border: '1px solid #e9ecef'
      }}>
        <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
          <input 
            type="checkbox" 
            checked={amend} 
            onChange={e=>setAmend(e.target.checked)}
            style={{transform: 'scale(1.1)', accentColor: '#F2C14E'}}
          /> 
          <span style={{fontWeight: 500, color: '#374151'}}>📝 Amend (tambahan hari-H)</span>
        </label>
        <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
          <input 
            type="checkbox" 
            checked={overrideHeavy} 
            onChange={e=>setOverrideHeavy(e.target.checked)}
            style={{transform: 'scale(1.1)', accentColor: '#F2C14E'}}
          /> 
          <span style={{fontWeight: 500, color: '#374151'}}>🔴 Setujui Rusak Berat</span>
        </label>
        <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
          <input 
            type="checkbox" 
            checked={overrideLight} 
            onChange={e=>setOverrideLight(e.target.checked)}
            style={{transform: 'scale(1.1)', accentColor: '#F2C14E'}}
          /> 
          <span style={{fontWeight: 500, color: '#374151'}}>🟡 Setujui Rusak Ringan</span>
        </label>
      </div>
      {amend && (
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
            📝 Alasan amend (wajib saat centang Amend)
          </span>
          <input 
            value={amendReason} 
            onChange={e=>setAmendReason(e.target.value)} 
            style={ipt} 
            placeholder="Contoh: tambahan mendadak dari klien" 
          />
        </label>
      )}
      {overrideHeavy && (
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
            🔴 Alasan override (wajib jika ada rusak berat)
          </span>
          <input 
            value={overrideReason} 
            onChange={e=>setOverrideReason(e.target.value)} 
            style={ipt} 
            placeholder="Contoh: unit cadangan darurat" 
          />
        </label>
      )}
      {overrideLight && (
        <label style={{display: 'grid', gap: 6}}>
          <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
            🟡 Alasan override (wajib jika setujui rusak ringan)
          </span>
          <input 
            value={overrideLightReason} 
            onChange={e=>setOverrideLightReason(e.target.value)} 
            style={ipt} 
            placeholder="Contoh: kondisi minor masih layak" 
          />
        </label>
      )}
      
      <button 
        disabled={loading} 
        style={{
          padding: '12px 24px',
          border: 'none',
          borderRadius: 8,
          background: loading ? '#9ca3af' : '#F2C14E',
          color: 'white',
          fontWeight: 600,
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginTop: 8
        }}
      >
        {loading ? '⏳ Menambahkan…' : '✅ Tambah ke Kontainer'}
      </button>
      
      {msg && (
        <div style={{
          padding: '12px 16px',
          background: msg.includes('Batch') ? '#f0f9ff' : '#fef2f2',
          border: `1px solid ${msg.includes('Batch') ? '#bfdbfe' : '#fecaca'}`,
          borderRadius: 8,
          color: msg.includes('Batch') ? '#1e40af' : '#dc2626',
          fontSize: 14,
          fontWeight: 500
        }}>
          {msg.includes('Batch') ? '✅ ' : '⚠️ '}{msg}
        </div>
      )}
    </form>
  )
}
