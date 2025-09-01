import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'
import CheckoutAdder from '../components/CheckoutAdder.jsx'
import ContainerItemsTable from '../components/ContainerItemsTable.jsx'

export default function ContainerDetail({ checkin=false }){
  const { cid } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dn, setDn] = useState(null) // latest snapshot payload
  const [scanRet, setScanRet] = useState('')
  const [retCond, setRetCond] = useState('good')
  const [retNote, setRetNote] = useState('')

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.getContainer(cid)
      setData(res)
      // ambil snapshot terbaru (jika ada)
      try { const snap = await api.getLatestDN(cid); setDn(snap) } catch {}
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ refresh() }, [cid])

  async function submitDN(){
    if (!confirm('Yakin daftar barang saat ini sudah benar untuk DN?')) return
    try{
      const out = await api.submitDN(cid)
      alert(`DN versi ${out.version} dibuat.`)
      await refresh()
    }catch(e){ alert(e.message) }
  }

  async function doCheckin(e){
    e.preventDefault()
    if (!scanRet.trim()) return
    try{
      await api.checkinItem(cid,{ id_code: scanRet.trim(), condition: retCond, damage_note: retNote })
      setScanRet(''); setRetNote(''); setRetCond('good')
      await refresh()
    }catch(err){ alert(err.message) }
  }

  async function closeContainer(){
    if (!confirm('Tutup kontainer?')) return
    try{ await api.closeContainer(cid); await refresh() }
    catch(e){ alert(e.message) }
  }
  function printDN(){
    if (!dn) { alert('Buat DN dulu via "Submit DN"'); return }
    window.print()
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
  const t = data.totals || {returned:0, good:0, rusak_ringan:0, rusak_berat:0, lost:0, out:0, all:0}

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      {/* Header actions */}
      <div className="noprint" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2>Kontainer: {c.id}</h2>
        <div style={{display:'flex', gap:8}}>
          <button onClick={submitDN} style={{padding:'8px 12px', border:'1px solid #111', borderRadius:8}}>Submit DN</button>
          <button onClick={printDN} style={{padding:'8px 12px', border:'1px solid #111', background:'#111', color:'#fff', borderRadius:8}} disabled={!dn}>
            {dn ? `Print DN (V${dn._meta?.version})` : 'Print DN (buat DN dulu)'}
          </button>
        </div>
      </div>

      {/* Header DN (printable) */}
      <div style={{border:'1px solid #eee', borderRadius:12, padding:16, marginBottom:16}}>
        <div style={{fontSize:18, fontWeight:700, marginBottom:8}}>Delivery Note</div>
        <div><b>Event:</b> {c.event_name}</div>
        <div><b>PIC:</b> {c.pic} {c.crew ? `· Crew: ${c.crew}` : ''}</div>
        <div><b>Lokasi:</b> {c.location || '-'}</div>
        <div><b>Jadwal:</b> {(c.start_date||'-')} → {(c.end_date||'-')}</div>
        <div><b>Status:</b> {c.status}</div>

        {/* PERHATIAN box jika ada rusak */}
        {(t.rusak_ringan>0 || t.rusak_berat>0) && (
          <div style={{marginTop:12, padding:12, border:'1px dashed #c77d00', background:'#fff8e1', borderRadius:8}}>
            <b>PERHATIAN:</b> Ada barang kondisi rusak.
            <div style={{fontSize:13, marginTop:6}}>
              <span style={{background:'#fff9c4', padding:'2px 6px', borderRadius:6}}>Kuning = Rusak ringan</span>
              {'  '}
              <span style={{background:'#ffebee', padding:'2px 6px', borderRadius:6}}>Merah = Rusak berat</span>
            </div>
            <div style={{marginTop:6, fontSize:13}}>
              Ringan: <b>{t.rusak_ringan}</b> · Berat: <b>{t.rusak_berat}</b>
            </div>
          </div>
        )}
      </div>

      {/* Counters (live) */}
      <div className="noprint" style={{display:'flex', gap:12, marginBottom:12}}>
        <Badge label="Total" value={t.all}/>
        <Badge label="Returned" value={t.returned}/>
        <Badge label="Good" value={t.good}/>
        <Badge label="Returned" value={t.good}/>
        <Badge label="Ringan" value={t.rusak_ringan} color="#b58900"/>
        <Badge label="Berat" value={t.rusak_berat} color="#c1121f"/>
        <Badge label="Lost" value={t.lost}/>
      </div>

      <div className="noprint">
        {!checkin && <CheckoutAdder cid={cid} onAdded={refresh}/>} 
        {checkin && (
          <>
            <form onSubmit={doCheckin} style={{marginTop:16, display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
              <h3>Check-In Barang</h3>
              <input value={scanRet} onChange={e=>setScanRet(e.target.value)} placeholder="Scan ID" style={{padding:8, border:'1px solid #ddd', borderRadius:8}}/>
              <select value={retCond} onChange={e=>setRetCond(e.target.value)} style={{padding:8, border:'1px solid #ddd', borderRadius:8}}>
                <option value="good">Returned</option>
                <option value="rusak_ringan">Rusak ringan</option>
                <option value="rusak_berat">Rusak berat</option>
                <option value="lost">Lost</option>
              </select>
              {retCond !== 'good' && retCond !== 'lost' && (
                <input value={retNote} onChange={e=>setRetNote(e.target.value)} placeholder="Catatan kerusakan" style={{padding:8, border:'1px solid #ddd', borderRadius:8}}/>
              )}
              <button style={{padding:'10px 14px'}}>Check-In</button>
            </form>
            {c.status === 'Open' && t.out === 0 && (
              <button onClick={closeContainer} style={{marginTop:16, padding:'10px 14px'}}>Tutup Kontainer</button>
            )}
          </>
        )}
        <CheckoutAdder cid={cid} onAdded={refresh}/>
        <form onSubmit={doCheckin} style={{marginTop:16, display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
          <h3>Check-In Barang</h3>
          <input value={scanRet} onChange={e=>setScanRet(e.target.value)} placeholder="Scan ID" style={{padding:8, border:'1px solid #ddd', borderRadius:8}}/>
          <select value={retCond} onChange={e=>setRetCond(e.target.value)} style={{padding:8, border:'1px solid #ddd', borderRadius:8}}>
            <option value="good">Returned</option>
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
      <ContainerItemsTable batches={data.batches} onVoid={checkin ? undefined : onVoid}/>
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
