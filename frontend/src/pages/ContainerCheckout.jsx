import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import CheckoutAdder from '../components/CheckoutAdder.jsx'
import ContainerItemsTable from '../components/ContainerItemsTable.jsx'
import { formatDateTime } from '../utils/date.js'

export default function ContainerCheckout(){
  const { cid } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [makingDN, setMakingDN] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [hasDN, setHasDN] = useState(false)

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.getContainer(cid)
      setData(res)
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }

  async function checkHasDN(){
    try { await api.getLatestDN(cid); setHasDN(true) }
    catch { setHasDN(false) }
  }

  useEffect(()=>{ refresh(); checkHasDN() }, [cid])

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
  // Ringkasan kondisi pada saat checkout (dari field `condition`)
  const sum = (() => {
    const b = data.batches || {}
    let good=0, ringan=0, berat=0, all=0
    for (const k of Object.keys(b)){
      for (const it of b[k] || []){
        all += 1
        const cond = (it.condition || 'good')
        if (cond === 'rusak_ringan') ringan += 1
        else if (cond === 'rusak_berat') berat += 1
        else good += 1
      }
    }
    return {all, good, rusak_ringan: ringan, rusak_berat: berat}
  })()

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
      <div className="noprint" style={{display:'flex', gap:8, marginBottom:12}}>
        <button
          onClick={() => navigate(`/containers/${cid}/surat-jalan`)}
          style={{padding:'8px 12px'}}
        >Lihat Surat Jalan</button>
      </div>
      {/* Ringkasan kondisi saat checkout */}
      <div className="noprint" style={{display:'flex', gap:12, marginBottom:12, alignItems:'center'}}>
        <Badge label="Total" value={sum.all}/>
        <Badge label="Good" value={sum.good}/>
        <Badge label="Ringan" value={sum.rusak_ringan} color="#b58900"/>
        <Badge label="Berat" value={sum.rusak_berat} color="#c1121f"/>
      </div>
      <div className="noprint" style={{display:'flex', gap:8, marginBottom:12}}>
        {c.status === 'Open' && (
          <button
            onClick={async () => {
              try { await api.getLatestDN(cid) } catch { alert('Harap buat Surat Jalan (Delivery Note) terlebih dahulu.'); return }
              if (!confirm('Ubah status menjadi Sedang Berjalan?')) return
              setUpdatingStatus(true)
              try {
                await api.setContainerStatus(cid, 'Sedang Berjalan')
                // Setelah status kembali ke Sedang Berjalan, arahkan ke halaman Check-In
                navigate(`/containers/${cid}/checkin`)
              } catch(e){
                alert(e.message)
              } finally {
                setUpdatingStatus(false)
              }
            }}
            style={{padding:'8px 12px'}}
            disabled={updatingStatus || !hasDN}
          >{updatingStatus ? 'Memproses…' : 'Ubah ke Sedang Berjalan'}</button>
        )}
      </div>
      {!hasDN && c.status === 'Open' && (
        <div className="noprint" style={{marginTop:-8, marginBottom:12, color:'#a33'}}>
          Buat/Update Surat Jalan dulu sebelum mengubah status.
        </div>
      )}
      <div className="noprint">
        <CheckoutAdder cid={cid} onAdded={refresh}/>
      </div>
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
