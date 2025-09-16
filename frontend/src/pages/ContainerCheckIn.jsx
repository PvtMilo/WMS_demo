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
  const [user, setUser] = useState(null)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const scanRef = useRef(null)
  const ipt = { 
    padding: 10, 
    border: '1px solid #d1d5db', 
    borderRadius: 8, 
    width: '100%',
    fontSize: 14,
    transition: 'border-color 0.2s ease'
  }

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


  async function doCheckin(e){
    e.preventDefault()
    const ids = [scanRet, ...listIds.split(/\r?\n/)]
      .map(s => (s || '').trim())
      .filter(Boolean)
    if (!ids.length) return
    try{
      for(const id of ids){
        await api.checkinItem(cid,{ id_code: id, condition: 'good' })
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
  const roleLc = String(user?.role || '').toLowerCase()
  const canVoid = roleLc === 'admin' // Batalkan hanya untuk admin
  const t = data.totals || {returned:0, good:0, rusak_ringan:0, rusak_berat:0, lost:0, all:0}

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
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Order:</span> {c.order_title || '-'}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Crew:</span> {c.crew || '-'}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Lokasi:</span> {c.location || '-'}</div>
              <div><span style={{fontWeight: 600, color: '#6b7280'}}>Jadwal:</span> {formatDateTime(c.start_date)} - {formatDateTime(c.end_date)}</div>
            </div>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="noprint" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, marginBottom: 20}}>
          <StatusCard label="Total" value={t.all} color="#F2C14E"/>
          <StatusCard label="Returned" value={t.returned} color="#8b5cf6"/>
          <StatusCard label="Good" value={t.good} color="#059669"/>
          <StatusCard label="Rusak Ringan" value={t.rusak_ringan} color="#d97706"/>
          <StatusCard label="Rusak Berat" value={t.rusak_berat} color="#dc2626"/>
          <StatusCard label="Lost" value={t.lost} color="#b00020"/>
        </div>

        {/* Action Buttons */}
        <div className="noprint" style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
          {c.status === 'Sedang Berjalan' && (
            <button
              onClick={async ()=>{
                if (!confirm('Penambahan barang: ubah status ke Open dan kembali ke Checkout?')) return
                setReopening(true)
                try{
                  await api.setContainerStatus(cid, 'Open')
                  navigate(`/containers/${cid}/checkout`)
                }catch(e){
                  alert(e.message)
                }finally{
                  setReopening(false)
                }
              }}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: reopening ? '#9ca3af' : 'white',
                color: reopening ? 'white' : '#374151',
                fontWeight: 600,
                cursor: reopening ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              disabled={reopening}
            >
              {reopening ? '⏳ Mengubah…' : '➕ Penambahan Barang'}
            </button>
          )}
          {c.status !== 'Closed' && (
            <button
              onClick={async ()=>{
                if (!confirm('Anda yakin ingin menutup kontainer ini?')) return
                setClosing(true)
                try{ await api.setContainerStatus(cid, 'Closed'); await refresh() } catch(e){ alert(e.message) } finally { setClosing(false) }
              }}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: 8,
                background: closing ? '#9ca3af' : '#dc2626',
                color: 'white',
                fontWeight: 600,
                cursor: closing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              disabled={closing}
            >
              {closing ? '⏳ Menutup...' : '🔒 Tutup Kontainer'}
            </button>
          )}
        </div>
      </div>

      {/* Check-In Form Section */}
      {c.status !== 'Closed' && (
        <div className="noprint" style={{marginBottom: 24}}>
          <form onSubmit={doCheckin} style={{
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
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}>
                📥
              </div>
              <h3 style={{margin: 0, color: '#1f2937', fontSize: 20, fontWeight: 600}}>
                Check-In Barang
              </h3>
            </div>

            <div style={{display: 'grid', gap: 12}}>
              <label style={{display: 'grid', gap: 6}}>
                <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
                  🔍 Scan ID
                </span>
                <input 
                  ref={scanRef} 
                  autoFocus 
                  value={scanRet} 
                  onChange={e=>setScanRet(e.target.value)} 
                  placeholder="Scan ID" 
                  style={ipt}
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

            <button 
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: 8,
                background: '#059669',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginTop: 8
              }}
            >
              ✅ Check-In
            </button>
          </form>
        </div>
      )}

      {/* Items Table Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        marginBottom: 24
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
          <ContainerItemsTable
            cid={cid}
            batches={data.batches}
            onVoid={canVoid && c.status !== 'Closed' ? onVoid : undefined}
            onUpdated={refresh}
            role={user?.role}
          />
        </div>
      </div>

      {/* Action Links */}
      <div className="noprint" style={{
        display: 'flex', 
        gap: 16, 
        flexWrap: 'wrap',
        padding: 16,
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <a 
          href={`/containers/${cid}/dn-history`}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: 'white',
            color: '#374151',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'all 0.2s ease'
          }}
        >
          📋 Lihat Riwayat Surat Jalan (Audit)
        </a>
        {c.status === 'Closed' && (
          <a 
            href={`/emoney/expense/${cid}`}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              background: '#F2C14E',
              color: 'white',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.2s ease'
            }}
          >
            💰 Input E-Money
          </a>
        )}
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
