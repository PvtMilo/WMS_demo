import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SuratJalan from '../components/SuratJalan.jsx'
import { api } from '../api.js'
import { formatDateTime } from '../utils/date.js'
import '../styles/print.css'

export default function SuratJalanPage() {
  const { cid, ver } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  async function loadLatest() {
    setLoading(true); setError('')
    try {
      const res = await api.getLatestDN(cid)
      setData(res)
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  async function loadVersion(v) {
    setLoading(true); setError('')
    try {
      const res = await api.getDNVersion(cid, v)
      setData(res)
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function makeSnapshotAndOpen() {
    setWorking(true)
    try {
      await api.submitDN(cid)
      await loadLatest()
    } catch (e) {
      alert(e.message)
    } finally {
      setWorking(false)
    }
  }

  useEffect(() => {
    if (ver) loadVersion(ver)
    else loadLatest()
  }, [cid, ver])

  const mapped = useMemo(() => {
    if (!data) return null
    const c = data.container || {}

    const dn = {
      number: `${c.id || ''}${data._meta?.version ? `/V${data._meta.version}` : ''}`,
      event_name: c.event_name,
      event_dt: `${formatDateTime(c.start_date, { monthText: true })} - ${formatDateTime(c.end_date, { monthText: true })}`,
      loading_dt: '',
      location: c.location,
      sales: '',
      pic: c.pic,
      crew: c.crew,

      ribbon_start: '',
      ribbon_end: '',
      holo_lens_used: '',
      frame_used: '',
      car: {},
      car_condition: {},
      car_payment_status: '',
      car_end_report: '',
      event_report: '',
      warehouse_note: '',
      note: data.note || '',
    }

    // Flatten batches into a simple array
    const batches = data.batches || {}
    const keys = Object.keys(batches).sort()
    const rows = []
    for (const k of keys) {
      for (const it of batches[k] || []) {
        let reason = '-'
        if (it.damage_note) reason = `Kerusakan: ${it.damage_note}`
        else if (it.amend_reason) reason = `Amend: ${it.amend_reason}`
        else if (it.reason) reason = `Override: ${it.reason}`

        // Build description: Kategori + nama + model (skip empty parts)
        const parts = [it.category, it.name, it.model].filter(Boolean)
        const desc = parts.length ? parts.join(' ') : (it.name || it.model || it.id_code)
        rows.push({
          description: desc,
          category: it.category || '',
          model: it.model || '',
          rack: it.rack || '',
          code: it.id_code,
          qty: 1,
          unit: 'Pcs',
          reason,
          condition: it.condition || 'good',
          entry_desc: 'out',
          exit_desc: it.return_condition ? 'in' : '',
        })
      }
    }

    return { dn, items: rows }
  }, [data])

  const toolbar = (
    <div className="noprint" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12 }}>
      <button onClick={() => navigate(-1)} style={{ padding: '8px 12px' }}>Kembali</button>
      <button onClick={makeSnapshotAndOpen} disabled={working} style={{ padding: '8px 12px' }}>
        {working ? 'Memproses…' : (data ? 'Update DN dari Data Terkini' : 'Buat DN dari Checkout')}
      </button>
      {data && (
        <>
          <button onClick={() => window.print()} style={{ padding: '8px 12px' }}>Cetak</button>
          <div style={{ marginLeft: 8, color: '#666' }}>
            Versi: <b>V{data._meta?.version}</b> · Dibuat: {formatDateTime(data._meta?.created_at, { monthText: true })}
          </div>
        </>
      )}
    </div>
  )

  if (loading) return <div style={{ padding: 24 }}>Memuat…</div>
  if (error && !data) return (
    <div style={{ padding: 24 }}>
      <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>
      <button onClick={makeSnapshotAndOpen} disabled={working} style={{ padding: '8px 12px' }}>
        {working ? 'Memproses…' : 'Buat DN dari Checkout'}
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      {toolbar}
      {mapped ? (
        <SuratJalan dn={mapped.dn} items={mapped.items} logoUrl={"/logo.png"} />
      ) : (
        <div style={{ padding: 24 }}>Tidak ada data DN</div>
      )}
      <style>{`@media print { .noprint { display: none !important; } }`}</style>
    </div>
  )
}
