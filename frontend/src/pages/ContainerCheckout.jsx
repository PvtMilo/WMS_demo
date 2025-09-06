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
    <div style={{fontFamily:'sans-serif'}}>
      {/* Header Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20}}>
          <div>
            <h2 style={{margin: '0 0 16px 0', color: '#1f2937', fontSize: 24, fontWeight: 700}}>
              Kontainer: {c.id}
            </h2>
            <div style={{display: 'grid', gap: 8, color: '#374151'}}>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Event:</span> {c.event_name}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>PIC:</span> {c.pic}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Crew:</span> {c.crew || '-'}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Lokasi:</span> {c.location || '-'}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Jadwal:</span> {formatDateTime(c.start_date)} - {formatDateTime(c.end_date)}</div>
            </div>
          </div>
          
          <div className="noprint" style={{display: 'flex', gap: 8}}>
            <button
              onClick={() => navigate(`/containers/${cid}/surat-jalan`)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: 'white',
                color: '#374151',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📄 Lihat Surat Jalan
            </button>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="noprint" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, marginBottom: 20}}>
          <StatusCard label="Total" value={sum.all} color="#F2C14E"/>
          <StatusCard label="Good" value={sum.good} color="#059669"/>
          <StatusCard label="Rusak Ringan" value={sum.rusak_ringan} color="#d97706"/>
          <StatusCard label="Rusak Berat" value={sum.rusak_berat} color="#dc2626"/>
        </div>

        {/* Action Buttons */}
        <div className="noprint" style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
          {c.status === 'Open' && (
            <button
              onClick={async () => {
                try { await api.getLatestDN(cid) } catch { alert('Harap buat Surat Jalan (Delivery Note) terlebih dahulu.'); return }
                if (!confirm('Ubah status menjadi Sedang Berjalan?')) return
                setUpdatingStatus(true)
                try {
                  await api.setContainerStatus(cid, 'Sedang Berjalan')
                  navigate(`/containers/${cid}/checkin`)
                } catch(e){
                  alert(e.message)
                } finally {
                  setUpdatingStatus(false)
                }
              }}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: 8,
                background: updatingStatus || !hasDN ? '#9ca3af' : '#F2C14E',
                color: 'white',
                fontWeight: 600,
                cursor: updatingStatus || !hasDN ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              disabled={updatingStatus || !hasDN}
            >
              {updatingStatus ? '⏳ Memproses…' : '▶️ Ubah ke Sedang Berjalan'}
            </button>
          )}
          
          {!hasDN && c.status === 'Open' && (
            <div style={{
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 14,
              fontWeight: 500
            }}>
              ⚠️ Buat/Update Surat Jalan dulu sebelum mengubah status
            </div>
          )}
        </div>
      </div>

      {/* Checkout Form Section */}
      <div className="noprint" style={{marginBottom: 24}}>
        <CheckoutAdder cid={cid} onAdded={refresh}/>
      </div>

      {/* Items Table Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderBottom: '1px solid #e5e5e5'
        }}>
          <h3 style={{margin: 0, color: '#1f2937', fontSize: 18, fontWeight: 600}}>
            📦 Items dalam Kontainer
          </h3>
        </div>
        <div style={{padding: 0}}>
          <ContainerItemsTable batches={data.batches} onVoid={onVoid}/>
        </div>
      </div>
    </div>
  )
}

function StatusCard({label, value, color='#F2C14E'}){
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e5e5',
      borderRadius: 12,
      padding: '16px 12px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: '#6b7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: color
      }}>
        {value}
      </div>
    </div>
  )
}
