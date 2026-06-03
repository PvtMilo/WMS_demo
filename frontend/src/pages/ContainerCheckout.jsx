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
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [hasDN, setHasDN] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [savingMeta, setSavingMeta] = useState(false)

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

  useEffect(()=>{
    if (data?.container && !isEditing){
      setEditForm(buildMetaFormState(data.container))
    }
  }, [data, isEditing])

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
  const formValues = editForm || buildMetaFormState(c)
  const detailInputStyle = { width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }
  const detailFieldStyle = { display: 'flex', flexDirection: 'column', gap: 4 }
  const detailLabelStyle = { fontWeight: 600, color: '#6b7280', fontSize: 13 }

  function handleFieldChange(field, value){
    setEditForm(prev => ({ ...(prev || buildMetaFormState(c)), [field]: value }))
  }

  function startEditing(){
    setEditForm(buildMetaFormState(c))
    setIsEditing(true)
  }

  function cancelEditing(){
    setIsEditing(false)
    setEditForm(buildMetaFormState(c))
  }

  async function saveMeta(){
    const form = editForm || buildMetaFormState(c)
    const trimmed = {
      event_name: (form.event_name || '').trim(),
      pic: (form.pic || '').trim(),
      crew: (form.crew || '').trim(),
      location: (form.location || '').trim(),
      order_title: (form.order_title || '').trim(),
    }
    const missing = []
    if (!trimmed.event_name) missing.push('Event')
    if (!trimmed.pic) missing.push('PIC')
    if (!trimmed.crew) missing.push('Crew')
    if (!trimmed.location) missing.push('Lokasi')
    if (!form.start_date) missing.push('Tanggal mulai')
    if (!form.end_date) missing.push('Tanggal selesai')
    if (missing.length){
      alert('Harap lengkapi data berikut sebelum menyimpan:\n- ' + missing.join('\n- '))
      return
    }
    const startIso = ensureIsoSeconds(form.start_date)
    const endIso = ensureIsoSeconds(form.end_date)
    const startDt = new Date(startIso)
    const endDt = new Date(endIso)
    if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())){
      alert('Tanggal mulai/selesai tidak valid.')
      return
    }
    if (startDt > endDt){
      alert('Tanggal selesai harus setelah atau sama dengan tanggal mulai.')
      return
    }

    setSavingMeta(true)
    try{
      await api.updateContainer(cid, {
        ...trimmed,
        order_title: trimmed.order_title,
        start_date: startIso,
        end_date: endIso,
      })
      setIsEditing(false)
      await refresh()
    }catch(e){
      alert(e.message)
    }finally{
      setSavingMeta(false)
    }
  }

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
              Event: {c.id}
            </h2>
            <div style={{display: 'grid', gap: 12, color: '#374151'}}>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Event</span>
                {isEditing ? (
                  <input
                    style={detailInputStyle}
                    value={formValues.event_name}
                    onChange={e=>handleFieldChange('event_name', e.target.value)}
                    placeholder="Nama event"
                  />
                ) : (
                  <span>{c.event_name}</span>
                )}
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>PIC</span>
                {isEditing ? (
                  <input
                    style={detailInputStyle}
                    value={formValues.pic}
                    onChange={e=>handleFieldChange('pic', e.target.value)}
                    placeholder="PIC"
                  />
                ) : (
                  <span>{c.pic}</span>
                )}
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Order</span>
                {isEditing ? (
                  <input
                    style={detailInputStyle}
                    value={formValues.order_title}
                    onChange={e=>handleFieldChange('order_title', e.target.value)}
                    placeholder="Nama/No. Order"
                  />
                ) : (
                  <span>{c.order_title || '-'}</span>
                )}
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Crew</span>
                {isEditing ? (
                  <input
                    style={detailInputStyle}
                    value={formValues.crew}
                    onChange={e=>handleFieldChange('crew', e.target.value)}
                    placeholder="Crew"
                  />
                ) : (
                  <span>{c.crew || '-'}</span>
                )}
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Lokasi</span>
                {isEditing ? (
                  <input
                    style={detailInputStyle}
                    value={formValues.location}
                    onChange={e=>handleFieldChange('location', e.target.value)}
                    placeholder="Lokasi event"
                  />
                ) : (
                  <span>{c.location || '-'}</span>
                )}
              </div>
              <div style={detailFieldStyle}>
                <span style={detailLabelStyle}>Jadwal</span>
                {isEditing ? (
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8}}>
                    <input
                      type="datetime-local"
                      style={detailInputStyle}
                      value={formValues.start_date}
                      onChange={e=>handleFieldChange('start_date', e.target.value)}
                    />
                    <input
                      type="datetime-local"
                      style={detailInputStyle}
                      value={formValues.end_date}
                      onChange={e=>handleFieldChange('end_date', e.target.value)}
                    />
                  </div>
                ) : (
                  <span>{formatDateTime(c.start_date)} - {formatDateTime(c.end_date)}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="noprint" style={{display: 'flex', flexDirection:'column', gap: 8, alignItems:'flex-end' }}>
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
            <div style={{display:'flex', gap: 8}}>
              <button
                type="button"
                className="container-detail-edit"
                style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: 'white',
                color: '#374151',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: 90,
                }}
                disabled={savingMeta}
                onClick={isEditing ? saveMeta : startEditing}
              >
                {isEditing ? (savingMeta ? 'Menyimpan...' : 'Simpan') : '🖊️ Edit'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    background: 'white',
                    cursor: savingMeta ? 'not-allowed' : 'pointer'
                  }}
                  onClick={cancelEditing}
                  disabled={savingMeta}
                >
                  Batal
                </button>
              )}
            </div>
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
                if (isEditing) {
                  alert('Harap selesaikan mode edit terlebih dahulu (Simpan atau Batal).');
                  return;
                }
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
                background: updatingStatus || !hasDN || isEditing ? '#9ca3af' : '#F2C14E',
                color: 'white',
                fontWeight: 600,
                cursor: updatingStatus || !hasDN || isEditing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              disabled={updatingStatus || !hasDN || isEditing}
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
            📦 Items dalam Event
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

function buildMetaFormState(container){
  const base = container || {}
  return {
    event_name: base.event_name || '',
    pic: base.pic || '',
    order_title: base.order_title || '',
    crew: base.crew || '',
    location: base.location || '',
    start_date: toDateTimeInput(base.start_date),
    end_date: toDateTimeInput(base.end_date),
  }
}

function toDateTimeInput(value){
  if (!value) return ''
  if (typeof value === 'string' && value.length >= 16 && value[10] === 'T'){
    return value.slice(0, 16)
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 16)
}

function ensureIsoSeconds(value){
  if (!value) return ''
  if (value.length === 16) return `${value}:00`
  return value
}
