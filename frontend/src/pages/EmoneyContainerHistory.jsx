import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function EmoneyContainerHistory(){
  const { cid } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState({ data: [], sum_topup: 0, sum_expense: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    api.emoneyTxByContainer(cid)
      .then(r => setData(r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [cid])

  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2' }
  const btn = { padding:'8px 12px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const fmtIDR = (c)=> 'Rp. ' + new Intl.NumberFormat('id-ID').format(Math.round((c||0)/100))

  if (loading) return <div style={{padding:24}}>Memuat…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={{margin:0}}>History E-Money untuk Container {cid}</h2>
        <div>
          <button onClick={()=>nav(`/emoney/expense/${cid}`)} style={{...btn, marginRight:8}}>Input Pengeluaran</button>
          <button onClick={()=>nav('/emoney')} style={btn}>Ke E-Money</button>
        </div>
      </div>

      <div style={{margin:'12px 0'}}>Total Expense: <b>{fmtIDR(data.sum_expense)}</b> · Total Topup terkait: <b>{fmtIDR(data.sum_topup)}</b></div>

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
            {data.data.length ? data.data.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.created_at}</td>
                <td style={td}>{t.emoney_label || t.emoney_id}</td>
                <td style={td}>{t.type}</td>
                <td style={td}>{fmtIDR(t.amount_cents)}</td>
                <td style={td}><a href={`/emoney/history/${cid}`}>{cid}</a></td>
                <td style={td}>{t.event_name || '-'}</td>
                <td style={td}>{t.pic || '-'}</td>
                <td style={td}>{t.note || '-'}</td>
              </tr>
            )) : (
              <tr><td style={td} colSpan={8}>Belum ada transaksi terkait</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
