import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import '../styles/print.css'

export default function EmoneyHistoryPage(){
  const nav = useNavigate()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [eid, setEid] = useState('')
  const [type, setType] = useState('')
  const [order, setOrder] = useState('asc')
  const [emoneys, setEmoneys] = useState([])
  const [data, setData] = useState({ data: [], sum_topup: 0, sum_expense: 0 })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    // Default date range: last 31 days
    const today = new Date()
    const endStr = today.toISOString().slice(0,10)
    const d2 = new Date(today.getTime() - 30*24*60*60*1000)
    const startStr = d2.toISOString().slice(0,10)
    setStart(startStr)
    setEnd(endStr)
  }, [])

  useEffect(() => {
    // load emoney list for dropdown
    api.listEmoney({ page: 1, per_page: 100 })
      .then(r => setEmoneys(r?.data || r || []))
      .catch(()=>{})
  }, [])

  const fmtIDR = (c)=> 'Rp. ' + new Intl.NumberFormat('id-ID').format(Math.round((c||0)/100))
  const fmtTS = (iso) => {
    if (!iso) return '-'
    try {
      const dt = new Date(iso)
      const s = dt.toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'Asia/Jakarta'
      })
      return s.replace(/(\d{2})\.(\d{2})/, '$1:$2') + ' Wib'
    } catch { return iso }
  }
  const btn = { padding:'8px 12px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8 }
  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2' }

  async function doFetch(){
    setLoading(true); setErr('')
    try{
      const params = { start, end, order }
      if (eid) params.eid = eid
      if (type) params.type = type
      const r = await api.emoneyTxRange(params)
      setData(r)
    }catch(e){ setErr(e.message || 'Gagal memuat data') }
    finally{ setLoading(false) }
  }

  // Auto-fetch when both dates are ready
  useEffect(() => { if (start && end) doFetch() }, [start, end])

  const net = useMemo(() => (data.sum_topup||0) - (data.sum_expense||0), [data])
  const emap = useMemo(() => {
    const m = {}
    emoneys.forEach(e => { m[e.id] = e.label })
    return m
  }, [emoneys])

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={{margin:0}}>History E-Money (Audit)</h2>
        <div className="noprint">
          <button onClick={()=>window.print()} style={{...btn, marginRight:8}}>Cetak</button>
          <button onClick={()=>nav('/emoney')} style={btn}>Ke E-Money</button>
        </div>
      </div>

      <div className="noprint" style={{display:'grid', gridTemplateColumns:'repeat(5, minmax(0, 1fr))', gap:8, margin:'12px 0'}}>
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} style={ipt} />
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} style={ipt} />
        <select value={eid} onChange={e=>setEid(e.target.value)} style={ipt}>
          <option value="">Semua E-Money</option>
          {emoneys.map(e => <option key={e.id} value={e.id}>{e.id} - {e.label}</option>)}
        </select>
        <select value={type} onChange={e=>setType(e.target.value)} style={ipt}>
          <option value="">Semua Tipe</option>
          <option value="expense">Expense</option>
          <option value="topup">Top Up</option>
        </select>
        <div style={{display:'flex', gap:8}}>
          <select value={order} onChange={e=>setOrder(e.target.value)} style={{...ipt, flex:1}}>
            <option value="asc">Terlama dulu</option>
            <option value="desc">Terbaru dulu</option>
          </select>
          <button onClick={doFetch} style={btn}>Filter</button>
        </div>
      </div>

      {err && <div style={{color:'crimson', marginBottom:8}}>{err}</div>}
      {loading ? (<div>Memuat…</div>) : (
        <>
          <div style={{margin:'8px 0'}}>
            <div>Periode: <b>{start}</b> s/d <b>{end}</b> {eid ? (<span>• E-Money: <b>{eid}</b> ({emap[eid]||'-'})</span>) : null} {type ? (<span>• Tipe: <b>{type}</b></span>) : null}</div>
            <div>Total Topup: <b>{fmtIDR(data.sum_topup)}</b> • Total Expense: <b>{fmtIDR(data.sum_expense)}</b> • Net: <b>{fmtIDR(net)}</b></div>
          </div>

          <div style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#fafafa'}}>
                  <th style={th}>Waktu</th>
                  <th style={th}>E-Money</th>
                  <th style={th}>Tipe</th>
                  <th style={th}>Jumlah</th>
                  <th style={th}>Container</th>
                  <th style={th}>Event</th>
                  <th style={th}>PIC</th>
                  <th style={th}>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {data.data && data.data.length ? data.data.map((t) => {
                  const isCF = String(t.note || '').toLowerCase().startsWith('archive_carry_forward')
                  const rowStyle = isCF ? { background:'#800000', color:'#fff' } : undefined
                  return (
                    <tr key={t.id} style={rowStyle}>
                      <td style={td}>{fmtTS(t.created_at)}</td>
                      <td style={td}>{(t.emoney_label || '-') + ' (' + t.emoney_id + ')'}</td>
                      <td style={td}>{t.type}</td>
                      <td style={td}>{fmtIDR(t.amount_cents)}</td>
                      <td style={td}>{t.ref_container_id || '-'}</td>
                      <td style={td}>{t.event_name || '-'}</td>
                      <td style={td}>{t.pic || '-'}</td>
                      <td style={td}>{t.note || '-'}</td>
                    </tr>
                  )
                }) : (
                  <tr><td style={td} colSpan={8}>Tidak ada transaksi pada periode ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
