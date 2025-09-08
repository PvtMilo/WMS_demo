import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import UniversalAdder from '../components/UniversalAdder.jsx'
import ContainerItemsTable from '../components/ContainerItemsTable.jsx'
import { formatDateTime } from '../utils/date.js'

export default function ContainerUniversal(){
  const { cid } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.getContainer(cid)
      setData(res)
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ refresh() }, [cid])

  if (loading) return <div style={{padding:24}}>Loading…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>
  if (!data) return <div style={{padding:24}}>Tidak ada data</div>

  const c = data.container

  return (
    <div style={{fontFamily:'sans-serif'}}>
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
              Universal Registration — {c.id}
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
            <button onClick={() => navigate(`/containers/${cid}/checkout`)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>Kembali ke Checkout</button>
            <button onClick={() => navigate(`/containers/${cid}/surat-jalan`)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>Lihat Surat Jalan</button>
          </div>
        </div>

        <div className="noprint" style={{marginBottom: 24}}>
          <UniversalAdder cid={cid} onAdded={refresh} />
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e5e5', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '1px solid #e5e5e5' }}>
            <h3 style={{margin: 0, color: '#1f2937', fontSize: 18, fontWeight: 600}}>Items dalam Kontainer</h3>
          </div>
          <div style={{padding: 0}}>
            <ContainerItemsTable batches={data.batches} onUpdated={refresh} />
          </div>
        </div>
      </div>
    </div>
  )
}

