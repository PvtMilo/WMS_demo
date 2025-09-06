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

  const ipt = { 
    padding: '8px 12px', 
    border: '1px solid #d1d5db', 
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    transition: 'all 0.2s ease',
    outline: 'none',
  }
  const btn = { 
    padding:'8px 16px', 
    border:'1px solid #d1d5db', 
    borderRadius:8, 
    background:'#fff', 
    cursor:'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease'
  }
  
  // Modern table styles (matching ItemTable.jsx)
  const th = { 
    textAlign: 'left', 
    padding: '14px 12px', 
    borderBottom: '2px solid #e5e5e5', 
    whiteSpace: 'nowrap',
    fontWeight: 600,
    fontSize: 14,
    color: '#374151'
  }
  const td = { 
    padding: '12px', 
    borderBottom: '1px solid #f1f5f9', 
    verticalAlign: 'top',
    fontSize: 14,
    color: '#1f2937'
  }
  const tdMoney = { 
    ...td, 
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontWeight: 600,
    color: '#059669'
  }
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
      <div style={{
        display:'flex', 
        justifyContent:'space-between', 
        alignItems:'center',
        marginBottom: 24
      }}>
        <div>
          <div style={{
            fontSize:13, 
            color:'#6b7280',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 4
          }}>
            E-Money ID: {e.id}
          </div>
          <h2 style={{
            margin:0, 
            fontSize: 28, 
            fontWeight: 600, 
            color: '#1f2937'
          }}>
            {e.label}
          </h2>
        </div>
        <div>
          <button 
            onClick={()=>nav('/emoney')} 
            className="noprint" 
            style={{
              ...btn,
              backgroundColor: '#6366f1',
              color: 'white',
              border: '1px solid #6366f1'
            }}
          >
            ← Kembali
          </button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:16, marginBottom: 24}}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: '20px',
          textAlign: 'center',
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            fontWeight: 500,
            fontSize: 14,
            marginBottom: 8,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Total Expense
          </div>
          <div style={{
            fontWeight: 700,
            fontSize: 24,
            color: '#ef4444',
          }}>
            {fmtIDR(data.tot_expense)}
          </div>
        </div>
        
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: '20px',
          textAlign: 'center',
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            fontWeight: 500,
            fontSize: 14,
            marginBottom: 8,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Current Balance
          </div>
          <div style={{
            fontWeight: 700,
            fontSize: 24,
            color: '#10b981',
          }}>
            {fmtIDR(data.balance)}
          </div>
        </div>
      </div>

      {e.status !== 'Closed' && (
        <div style={{
          marginBottom: 24,
          padding: 20,
          backgroundColor: 'white',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: 18,
            fontWeight: 600,
            color: '#1f2937'
          }}>
            Tambah Transaksi
          </h3>
          <form onSubmit={addTx} className="noprint" style={{display:'grid', gap:16}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:12}}>
              <select value={ttype} onChange={v=>setTtype(v.target.value)} style={ipt}>
                <option value="expense">Expense</option>
                <option value="topup">Top Up</option>
              </select>
              <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Jumlah (contoh: 100000)" style={ipt} />
              <input value={cid} onChange={e=>setCid(e.target.value)} placeholder="Container ID (opsional)" style={ipt} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'end'}}>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Catatan (wajib untuk expense)" style={ipt} />
              <button style={{
                ...btn,
                backgroundColor: '#10b981',
                color: 'white',
                border: '1px solid #10b981',
                padding: '10px 20px'
              }}>
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ 
        overflow: 'auto', 
        border: '1px solid #e5e5e5', 
        borderRadius: 12, 
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        marginBottom: 16
      }}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderBottom: '2px solid #e5e5e5'
            }}>
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
            {data.tx.length ? data.tx.map((t, index) => {
              const isCF = String(t.note || '').toLowerCase().startsWith('archive_carry_forward')
              const baseRowStyle = {
                backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white',
                transition: 'background-color 0.2s ease'
              }
              const rowStyle = isCF ? { 
                ...baseRowStyle,
                background:'#ffebee', 
                color:'#fff'
              } : baseRowStyle
              return (
                <tr key={t.id} style={rowStyle}>
                  <td style={td}>{fmtTS(t.created_at)}</td>
                  <td style={td}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: t.type === 'expense' ? '#fef2f2' : '#f0fdf4',
                      color: t.type === 'expense' ? '#dc2626' : '#059669'
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={tdMoney}>{fmtIDR(t.amount_cents)}</td>
                  <td style={td}>
                    {t.ref_container_id ? (
                      <a 
                        href={`/emoney/history/${t.ref_container_id}`}
                        style={{
                          color: '#6366f1',
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                      >
                        {t.ref_container_id}
                      </a>
                    ) : '-'}
                  </td>
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
