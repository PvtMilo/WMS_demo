import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function EmoneyDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ttype, setTtype] = useState('expense')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [cid, setCid] = useState('')

  async function refresh(){
    setLoading(true); setError('')
    try{
      const res = await api.getEmoney(id)
      setData(res)
    }catch(e){ setError(e.message) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ refresh() }, [id])

  async function addTx(e){
    e.preventDefault()
    const amt = (amount || '').trim()
    if (!amt) { alert('Masukkan amount'); return }
    try{
      await api.addEmoneyTx(id, { type: ttype, amount: amt, note, container_id: cid || undefined })
      setAmount(''); setNote(''); setCid('')
      await refresh()
    }catch(e){ alert(e.message) }
  }

  // E-Money tidak punya status close/open lagi

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8 }
  const btn = { padding:'8px 12px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2' }
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

  if (loading) return <div style={{padding:24}}>Memuat…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>
  if (!data) return <div style={{padding:24}}>Tidak ada data</div>

  const e = data.emoney
  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontSize:12, color:'#666'}}>{e.id}</div>
          <h2 style={{margin:'4px 0'}}>{e.label}</h2>
        </div>
        <div>
          <button onClick={()=>nav('/emoney')} className="noprint" style={{...btn, marginRight:8}}>Kembali</button>
        </div>
      </div>

      <div style={{marginTop:12, display:'flex', gap:16, flexWrap:'wrap'}}>
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <div>Total Expense: <b>{fmtIDR(data.tot_expense)}</b></div>
          <div>Balance: <b>{fmtIDR(data.balance)}</b></div>
        </div>
      </div>

      {e.status !== 'Closed' && (
        <form onSubmit={addTx} className="noprint" style={{marginTop:16, display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
          <div style={{fontWeight:700}}>Tambah Transaksi</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:8}}>
            <select value={ttype} onChange={v=>setTtype(v.target.value)} style={ipt}>
              <option value="expense">Expense</option>
              <option value="topup">Top Up</option>
            </select>
            <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Jumlah (contoh: 100000)" style={ipt} />
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Catatan (wajib untuk expense)" style={ipt} />
          </div>
          <input value={cid} onChange={e=>setCid(e.target.value)} placeholder="Container ID (opsional)" style={ipt} />
          <button style={btn}>Simpan</button>
        </form>
      )}

      <div style={{marginTop:16, border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#fafafa'}}>
              <th style={th}>Waktu</th>
              <th style={th}>Tipe</th>
              <th style={th}>Jumlah</th>
              <th style={th}>Container</th>
              <th style={th}>Event</th>
              <th style={th}>PIC</th>
              <th style={th}>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {data.tx.length ? data.tx.map((t) => {
              const isCF = String(t.note || '').toLowerCase().startsWith('archive_carry_forward')
              const rowStyle = isCF ? { background:'#800000', color:'#fff' } : undefined
              return (
                <tr key={t.id} style={rowStyle}>
                  <td style={td}>{fmtTS(t.created_at)}</td>
                  <td style={td}>{t.type}</td>
                  <td style={td}>{fmtIDR(t.amount_cents)}</td>
                  <td style={td}>{t.ref_container_id ? (<a href={`/emoney/history/${t.ref_container_id}`}>{t.ref_container_id}</a>) : '-'}</td>
                  <td style={td}>{t.event_name || '-'}</td>
                  <td style={td}>{t.pic || '-'}</td>
                  <td style={td}>{t.note || '-'}</td>
                </tr>
              )
            }) : (
              <tr><td style={td} colSpan={7}>Belum ada transaksi</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
