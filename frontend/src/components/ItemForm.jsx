import React, { useState } from 'react'
import { api } from '../api.js'   // pastikan file api.js ada di src/

export default function ItemForm({ onCreated }) {
  const [prefix, setPrefix]    = useState('CAM')
  const [name, setName]        = useState('Canon 70D')
  const [category, setCategory]= useState('Camera')
  const [model, setModel]      = useState('70D')
  const [rack, setRack]        = useState('R1-A')
  const [qty, setQty]          = useState(3)
  const [msg, setMsg]          = useState('')
  const [loading, setLoading]  = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(''); setLoading(true)
    try {
      const out = await api.batchCreateItems({
        prefix, name, category, model, rack, qty: Number(qty)
      })
      setMsg(`✅ Berhasil buat ${out.created?.length || 0} unit`)
      onCreated?.()
      setQty(1)
    } catch (e) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8, width:'100%' }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
      <h3>Pendaftaran Barang (Batch)</h3>
      <label>Prefix <input value={prefix} onChange={e=>setPrefix(e.target.value)} style={ipt} required/></label>
      <label>Nama <input value={name} onChange={e=>setName(e.target.value)} style={ipt} required/></label>
      <label>Kategori <input value={category} onChange={e=>setCategory(e.target.value)} style={ipt} required/></label>
      <label>Model <input value={model} onChange={e=>setModel(e.target.value)} style={ipt} required/></label>
      <label>Rak <input value={rack} onChange={e=>setRack(e.target.value)} style={ipt} required/></label>
      <label>Qty
        <input type="number" min="1" max="500" value={qty}
               onChange={e=>setQty(e.target.value)} style={ipt} required/>
      </label>
      <button disabled={loading} style={{padding:'10px 14px', borderRadius:8}}>
        {loading ? 'Menyimpan…' : 'Simpan'}
      </button>
      {msg && <div style={{fontSize:13}}>{msg}</div>}
    </form>
  )
}