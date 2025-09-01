import React, { useState, useRef } from 'react'
import { api } from '../api.js'

export default function CheckoutAdder({ cid, onAdded }) {
  const [scanId, setScanId] = useState('')
  const [listIds, setListIds] = useState('')
  const [amend, setAmend] = useState(false)
  const [overrideHeavy, setOverrideHeavy] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
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
    if (overrideHeavy && !overrideReason.trim()) {
      setMsg('Alasan override untuk rusak berat wajib diisi'); return
    }
    setLoading(true); setMsg('')
    try {
      const out = await api.addItemsToContainer(cid, {
        ids, amend, override_heavy: overrideHeavy, override_reason: overrideReason
      })
      const c = out.added_counts || {}
      const s = out.skipped || []
      setMsg(`Batch ${out.batch}: +${(c.good||0)} Good, +${(c.rusak_ringan||0)} Ringan, +${(c.rusak_berat||0)} Berat. Skipped: ${s.length}`)
      setScanId('')
      scanRef.current?.focus()
      setListIds('')
      onAdded?.()
    } catch (e) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8, width:'100%' }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
      <h3>Checkout / Tambah Barang</h3>
      <label>Scan ID (USB scanner)
        <input ref={scanRef} autoFocus value={scanId} onChange={e=>setScanId(e.target.value)} style={ipt} placeholder="CAM-70D-001" />
      </label>
      <label>Input manual (satu ID per baris)
        <textarea value={listIds} onChange={e=>setListIds(e.target.value)} style={{...ipt, height:120}} placeholder="CAM-70D-002&#10;CAM-70D-003"></textarea>
      </label>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        <label><input type="checkbox" checked={amend} onChange={e=>setAmend(e.target.checked)} /> <span style={{marginLeft:8}}>Amend (tambahan hari-H)</span></label>
        <label><input type="checkbox" checked={overrideHeavy} onChange={e=>setOverrideHeavy(e.target.checked)} /> <span style={{marginLeft:8}}>Setujui Rusak Berat</span></label>
      </div>
      {overrideHeavy && (
        <label>Alasan override (wajib jika ada rusak berat)
          <input value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} style={ipt} placeholder="Contoh: unit cadangan darurat" />
        </label>
      )}
      <button disabled={loading} style={{padding:'10px 14px'}}>{loading?'Menambahkan…':'Tambah ke Kontainer'}</button>
      {msg && <div style={{fontSize:13}}>{msg}</div>}
    </form>
  )
}