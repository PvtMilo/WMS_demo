import React, { useState } from 'react'
import { api } from '../api.js'

export default function UniversalItemForm({ onCreated }) {
  const [prefix, setPrefix]    = useState('UNI')
  const [name, setName]        = useState('Universal')
  const [category, setCategory]= useState('General')
  const [model, setModel]      = useState('BOX')
  const [rack, setRack]        = useState('R0-U')
  const [qty, setQty]          = useState(1)
  const [msg, setMsg]          = useState('')
  const [loading, setLoading]  = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(''); setLoading(true)
    try {
      const out = await api.batchCreateItems({
        prefix, name, category, model, rack, qty: Number(qty), is_universal: true,
      })
      setMsg(`✓ Berhasil buat ${out.created?.length || 0} universal unit`)
      onCreated?.()
      setQty(1)
    } catch (e) {
      setMsg(`⚠️ ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8, width:'100%', backgroundColor: '#f5f5f5' }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, padding:16, border:'1px solid #e5e5e5', borderRadius:12, backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'}}>
      <h3>Pendaftaran Barang Universal (Batch)</h3>
      <div style={{fontSize:12, color:'#374151', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:10, marginTop:-6}}>
        Barang universal tidak mengunci saat checkout, otomatis diabaikan pada aturan wajib kembali, dan tetap tercatat di Surat Jalan.
      </div>
      <label>Prefix <input value={prefix} onChange={e=>setPrefix(e.target.value)} style={ipt} required/></label>
      <label>Nama <input value={name} onChange={e=>setName(e.target.value)} style={ipt} required/></label>
      <label>Kategori <input value={category} onChange={e=>setCategory(e.target.value)} style={ipt} required/></label>
      <label>Model <input value={model} onChange={e=>setModel(e.target.value)} style={ipt} required/></label>
      <label>Rak <input value={rack} onChange={e=>setRack(e.target.value)} style={ipt} required/></label>
      <label>Qty
        <input type="number" min="1" max="500" value={qty}
               onChange={e=>setQty(e.target.value)} style={ipt} required/>
      </label>
      <button disabled={loading} style={{padding:'10px 14px', borderRadius:8, backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1}}>
        {loading ? 'Menyimpan…' : 'Simpan' }
      </button>
      {msg && <div style={{fontSize:13}}>{msg}</div>}
    </form>
  )
}

