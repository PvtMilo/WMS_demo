import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getToken } from '../api.js'
import ContainerItemsTable from '../components/ContainerItemsTable.jsx'
import { formatDateTime } from '../utils/date.js'

export default function ContainerCheckIn(){
  const { cid } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scanRet, setScanRet] = useState('')
  const [listIds, setListIds] = useState('')
  const [retCond, setRetCond] = useState('good')
  const [user, setUser] = useState(null)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
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
  useEffect(() => { (async()=>{ try{ if(getToken()){ const me=await api.me(); setUser(me.user) } }catch{} })() }, [])
  useEffect(()=>{ scanRef.current?.focus() }, [])

  // Saat scan ID berubah, set default kondisi return mengikuti kondisi saat checkout
  useEffect(() => {
    const id = (scanRet || '').trim()
    if (!id || !data || !data.batches) return
    const prev = findPrevCond(data.batches, id)
    if (prev) setRetCond(prev)
  }, [scanRet, data])

  async function doCheckin(e){
    e.preventDefault()
    const ids = [scanRet, ...listIds.split(/\r?\n/)]
      .map(s => (s || '').trim())
      .filter(Boolean)
    if (!ids.length) return
    try{
      for(const id of ids){
        await api.checkinItem(cid,{ id_code: id, condition: retCond })
      }
      setScanRet(''); setListIds('')
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

  if (loading) return <div style={{padding:24}}>Loading...</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>
  if (!data) return <div style={{padding:24}}>Tidak ada data</div>

  const c = data.container
  const t = data.totals || {returned:0, good:0, rusak_ringan:0, rusak_berat:0, all:0}

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Kontainer: {c.id}</h2>
      <div style={{marginBottom:16}}>
        <div><b>Event:</b> {c.event_name}</div>
        <div><b>PIC:</b> {c.pic}</div>
        <div><b>Crew:</b> {c.crew || '-'}</div>
        <div><b>Lokasi:</b> {c.location || '-'}</div>
        <div><b>Jadwal:</b> {formatDateTime(c.start_date)} - {formatDateTime(c.end_date)}</div>
      </div>

      {/* Counters (live) */}
      <div className="noprint" style={{display:'flex', gap:12, marginBottom:12, alignItems:'center'}}>
        <Badge label="Total" value={t.all}/>
        <Badge label="Returned" value={t.returned}/>
        <Badge label="Good" value={t.good}/>
        <Badge label="Ringan" value={t.rusak_ringan} color="#b58900"/>
        <Badge label="Berat" value={t.rusak_berat} color="#c1121f"/>
        {c.status === 'Sedang Berjalan' && (
          <button
            onClick={async ()=>{
              if (!confirm('Penambahan barang: ubah status ke Open dan kembali ke Checkout?')) return
              setReopening(true)
              try{
                await api.setContainerStatus(cid, 'Open')
                // Arahkan ke halaman Checkout untuk menambah barang & update DN
                navigate(`/containers/${cid}/checkout`)
              }catch(e){
                alert(e.message)
              }finally{
                setReopening(false)
              }
            }}
            style={{marginLeft:12, padding:'8px 12px'}}
            disabled={reopening}
          >{reopening ? 'Mengubah…' : 'Penambahan Barang'}</button>
        )}
        {c.status !== 'Closed' && (
          <button
            onClick={async ()=>{
              if (!confirm('Anda yakin ingin menutup kontainer ini?')) return
              setClosing(true)
              try{ await api.setContainerStatus(cid, 'Closed'); await refresh() } catch(e){ alert(e.message) } finally { setClosing(false) }
            }}
            style={{marginLeft:12, padding:'8px 12px'}}
            disabled={closing}
          >{closing ? 'Menutup...' : 'Tutup Kontainer'}</button>
        )}
      </div>

      {c.status !== 'Closed' && (
        <div className="noprint">
        <form onSubmit={doCheckin} style={{marginTop:16, display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
          <h3>Check-In Barang</h3>
          <input ref={scanRef} autoFocus value={scanRet} onChange={e=>setScanRet(e.target.value)} placeholder="Scan ID" style={ipt}/>
          <label style={{display:'grid', gap:4}}>Input manual (satu ID per baris)
            <textarea value={listIds} onChange={e=>setListIds(e.target.value)} style={{...ipt, height:120}} placeholder="CAM-70D-002&#10;CAM-70D-003"></textarea>
          </label>
          {/* Default mengikuti kondisi saat checkout. Perubahan dilakukan per-item pada tabel di bawah. */}
          <button style={{padding:'10px 14px'}}>Check-In</button>
        </form>
        </div>
      )}

      {/* Tabel item per batch (printable) - live view */}
      <ContainerItemsTable cid={cid} batches={data.batches} role={user?.role} onVoid={(String(user?.role||'').toLowerCase()==='admin' && c.status !== 'Closed') ? onVoid : undefined} onUpdated={refresh}/>
      <div className="noprint" style={{marginTop:12}}>
        <a href={`/containers/${cid}/dn-history`}>Lihat Riwayat Surat Jalan (Audit)</a>
        {c.status === 'Closed' && (
          <>
            <span>{' '}</span>
            <a href={`/emoney/expense/${cid}`} style={{marginLeft:12}}>Input E-Money</a>
          </>
        )}
      </div>
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

// Helpers: temukan kondisi saat checkout untuk ID tertentu
function findPrevCond(batches, id){
  const keys = Object.keys(batches || {})
  for (const k of keys){
    const arr = batches[k] || []
    const it = arr.find(x => (x.id_code || '').trim().toUpperCase() === id.toUpperCase())
    if (it) return it.condition || 'good'
  }
  return null
}

function allowedOptions(prev){
  if (prev === 'rusak_berat') return new Set(['rusak_berat'])
  if (prev === 'rusak_ringan') return new Set(['rusak_ringan','rusak_berat'])
  return new Set(['good','rusak_ringan','rusak_berat'])
}

