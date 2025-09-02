import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function EmoneyExpenseForm(){
  const { cid } = useParams()
  const nav = useNavigate()
  const [list, setList] = useState([])
  const [eid, setEid] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.listEmoney({ per_page: 100 }).then(r => setList(r.data||[])).catch(()=>{})
  }, [])

  function fmtIDR(c){ return 'Rp. ' + new Intl.NumberFormat('id-ID').format(Math.round((c||0)/100)) }

  async function submit(e){
    e.preventDefault()
    if (!eid) { alert('Pilih E-Money'); return }
    if (!(amount||'').trim()) { alert('Jumlah wajib'); return }
    const toCents = (val)=>{ const s=String(val||'').replace(/[^0-9]/g,''); const n=parseInt(s||'0',10); return (isFinite(n)? n*100 : 0) }
    if (selected && toCents(amount) > (selected.balance||0)) { alert('Saldo E-Money tidak cukup'); return }
    try{
      await api.addEmoneyTx(eid, { type:'expense', amount, note, container_id: cid })
      setMsg('Pengeluaran tercatat')
      setAmount(''); setNote('')
    }catch(e){ alert(e.message) }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8 }
  const btn = { padding:'8px 12px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }

  const selected = list.find(x => x.id === eid)

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Input Pengeluaran E-Money</h2>
      <div style={{marginBottom:8, color:'#666'}}>Container: <b>{cid}</b></div>
      <form onSubmit={submit} style={{display:'grid', gap:8, maxWidth:520, padding:16, border:'1px solid #eee', borderRadius:12}}>
        <label>E-Money
          <select value={eid} onChange={e=>setEid(e.target.value)} style={ipt}>
            <option value="">-- pilih --</option>
            {list.map(e => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </label>
        {selected && (
          <div style={{fontSize:13, color:'#333'}}>Saldo saat ini: <b>{fmtIDR(selected.balance)}</b> · Topup: {fmtIDR(selected.tot_topup)} · Expense: {fmtIDR(selected.tot_expense)}</div>
        )}
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Jumlah (contoh: 150000)" style={ipt}/>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Catatan (misal: Pengeluaran PIC Sam - Jagakarsa)" style={ipt}/>
        <div style={{display:'flex', gap:8}}>
          <button style={btn}>Simpan</button>
          <button type="button" onClick={()=>nav(`/emoney/history/${cid}`)} style={btn}>Lihat History</button>
        </div>
        {msg && <div style={{fontSize:13, color:'#0a7'}}>{msg}</div>}
      </form>
    </div>
  )
}
