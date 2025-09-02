﻿import React, { useEffect, useState } from 'react'
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

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.getContainer(cid)
      setData(res)
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ refresh() }, [cid])

  async function onVoid(id_code, reason){
    try{
      await api.voidContainerItem(cid, { id_code, reason })
      await refresh()
    }catch(e){ alert(e.message) }
  }

  if (loading) return <div style={{padding:24}}>Loadingâ€¦</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>
  if (!data) return <div style={{padding:24}}>Tidak ada data</div>

  const c = data.container

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
      <div className="noprint" style={{display:'flex', gap:8, marginBottom:12}}>
        {c.status === 'Open' && (
          <button
            onClick={async () => {
              if (!confirm('Ubah status menjadi Sedang Berjalan?')) return
              setUpdatingStatus(true)
              try { await api.setContainerStatus(cid, 'Sedang Berjalan'); await refresh() } catch(e){ alert(e.message) } finally { setUpdatingStatus(false) }
            }}
            style={{padding:'8px 12px'}}
            disabled={updatingStatus}
          >{updatingStatus ? 'Memprosesâ€¦' : 'Ubah ke Sedang Berjalan'}</button>
        )}
      </div>
      <div className="noprint">
        <CheckoutAdder cid={cid} onAdded={refresh}/>
      </div>
      <ContainerItemsTable batches={data.batches} onVoid={onVoid}/>
    </div>
  )
}
