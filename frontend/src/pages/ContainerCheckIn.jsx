import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'
import ContainerItemsTable from '../components/ContainerItemsTable.jsx'

export default function ContainerCheckIn(){
  const { cid } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scanRet, setScanRet] = useState('')
  const [listIds, setListIds] = useState('')
  const [retCond, setRetCond] = useState('good')
  const [retNote, setRetNote] = useState('')
  const scanRef = useRef(null)
  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8, width:'100%' }

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.getContainer(cid)
      setData(res)
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ refresh() }, [cid])
  useEffect(()=>{ scanRef.current?.focus() }, [])

  async function doCheckin(e){
    e.preventDefault()
    const ids = [scanRet, ...listIds.split(/\r?\n/)]
      .map(s => (s || '').trim())
      .filter(Boolean)
    if (!ids.length) return
    try{
      for(const id of ids){
        await api.checkinItem(cid,{ id_code: id, condition: retCond, damage_note: retNote })
      }
      setScanRet(''); setListIds(''); setRetNote(''); setRetCond('good')
      await refresh()
      scanRef.current?.focus()
    }catch(err){ alert(err.message) }
  }

  async function onVoid(id_code, reason){
    try{
      await api.voidContainerItem(cid, { id_code, reason })
      await refresh()
    }catch(e){ alert(e.message) }
  }

  if (loading) return <div style={{padding:24}}>Loading…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>
  if (!data) return <div style={{padding:24}}>Tidak ada data</div>

  const c = data.container
  const t = data.totals || {returned:0, good:0, rusak_ringan:0, rusak_berat:0, all:0}

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Kontainer: {c.id}</h2>

      {/* Counters (live) */}
      <div className="noprint" style={{display:'flex', gap:12, marginBottom:12}}>
        <Badge label="Total" value={t.all}/>
        <Badge label="Returned" value={t.returned}/>
        <Badge label="Good" value={t.good}/>
        <Badge label="Ringan" value={t.rusak_ringan} color="#b58900"/>
        <Badge label="Berat" value={t.rusak_berat} color="#c1121f"/>
      </div>

      <div className="noprint">
        <form onSubmit={doCheckin} style={{marginTop:16, display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
          <h3>Check-In Barang</h3>
          <input ref={scanRef} autoFocus value={scanRet} onChange={e=>setScanRet(e.target.value)} placeholder="Scan ID" style={ipt}/>
          <label style={{display:'grid', gap:4}}>Input manual (satu ID per baris)
            <textarea value={listIds} onChange={e=>setListIds(e.target.value)} style={{...ipt, height:120}} placeholder="CAM-70D-002&#10;CAM-70D-003"></textarea>
          </label>
          <select value={retCond} onChange={e=>setRetCond(e.target.value)} style={ipt}>
            <option value="good">Good</option>
            <option value="rusak_ringan">Rusak ringan</option>
            <option value="rusak_berat">Rusak berat</option>
          </select>
          {retCond !== 'good' && (
            <input value={retNote} onChange={e=>setRetNote(e.target.value)} placeholder="Catatan kerusakan" style={{padding:8, border:'1px solid #ddd', borderRadius:8}}/>
          )}
          <button style={{padding:'10px 14px'}}>Check-In</button>
        </form>
      </div>

      {/* Tabel item per batch (printable) - live view */}
      <ContainerItemsTable batches={data.batches} onVoid={onVoid}/>
    </div>
  )
}

function Badge({label, value, color='#111'}){
  return (
    <div style={{border:'1px solid #eee', borderRadius:8, padding:'8px 12px', background:'#fff'}}>
      <div style={{fontSize:12, color:'#666'}}>{label}</div>
      <div style={{fontSize:18, fontWeight:700, color}}>{value}</div>
    </div>
  )
}
