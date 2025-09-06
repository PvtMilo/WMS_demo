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
      // Refresh selected e-money summary so the saldo/expense updates immediately
      try {
        const fresh = await api.getEmoney(eid)
        setList(prev => prev.map(x => {
          if (x.id !== eid) return x
          const patch = {}
          if (typeof fresh.balance !== 'undefined') patch.balance = fresh.balance
          if (typeof fresh.tot_expense !== 'undefined') patch.tot_expense = fresh.tot_expense
          if (typeof fresh.tot_topup !== 'undefined') patch.tot_topup = fresh.tot_topup
          return { ...x, ...patch }
        }))
      } catch {}
      setMsg('Pengeluaran tercatat')
      setAmount(''); setNote('')
    }catch(e){ alert(e.message) }
  }

  const ipt = { 
    padding: 10, 
    border: '1px solid #d1d5db', 
    borderRadius: 8, 
    width: '100%',
    fontSize: 14,
    transition: 'border-color 0.2s ease'
  }

  const selected = list.find(x => x.id === eid)

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
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
          <button 
            onClick={() => nav(-1)} 
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: 'white',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            ← Kembali
          </button>
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
            💰
          </div>
          <h2 style={{margin: 0, color: '#1f2937', fontSize: 24, fontWeight: 700}}>
            Input Pengeluaran E-Money
          </h2>
        </div>
        
        <div style={{
          padding: '12px 16px',
          background: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          color: '#1e40af',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          📦 <strong>Container:</strong> {cid}
        </div>
      </div>

      {/* Form Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maxWidth: 600
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20
        }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #F2C14E 0%, #e6b800 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}>
            💳
          </div>
          <h3 style={{margin: 0, color: '#1f2937', fontSize: 20, fontWeight: 600}}>
            Form Pengeluaran
          </h3>
        </div>

        <form onSubmit={submit} style={{display: 'grid', gap: 16}}>
          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
              🏦 Pilih E-Money
            </span>
            <select value={eid} onChange={e=>setEid(e.target.value)} style={ipt}>
              <option value="">-- Pilih akun E-Money --</option>
              {list.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </label>

          {selected && (
            <div style={{
              padding: '16px',
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: 8,
              display: 'grid',
              gap: 8
            }}>
              <div style={{fontWeight: 600, color: '#1f2937', marginBottom: 8}}>
                📊 Informasi Saldo
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12}}>
                <div style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #e5e5e5',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>SALDO SAAT INI</div>
                  <div style={{fontSize: 16, fontWeight: 700, color: '#059669'}}>{fmtIDR(selected.balance)}</div>
                </div>
                {false && (
                  <div style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: 8,
                    border: '1px solid #e5e5e5',
                    textAlign: 'center'
                  }}>
                    <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>TOTAL TOPUP</div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#3b82f6'}}>{fmtIDR(selected.tot_topup)}</div>
                  </div>
                )}
                <div style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #e5e5e5',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: 12, color: '#6b7280', marginBottom: 4}}>TOTAL EXPENSE</div>
                  <div style={{fontSize: 16, fontWeight: 700, color: '#dc2626'}}>{fmtIDR(selected.tot_expense)}</div>
                </div>
              </div>
            </div>
          )}

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
              💵 Jumlah Pengeluaran
            </span>
            <input 
              value={amount} 
              onChange={e=>setAmount(e.target.value)} 
              placeholder="Contoh: 150000" 
              style={ipt}
            />
          </label>

          <label style={{display: 'grid', gap: 6}}>
            <span style={{fontWeight: 500, color: '#374151', fontSize: 14}}>
              📝 Catatan
            </span>
            <input 
              value={note} 
              onChange={e=>setNote(e.target.value)} 
              placeholder="Contoh: Pengeluaran PIC Sam - Jagakarsa" 
              style={ipt}
            />
          </label>

          <div style={{display: 'flex', gap: 12, marginTop: 8}}>
            <button 
              type="submit"
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
                flex: 1
              }}
            >
              💾 Simpan Pengeluaran
            </button>
            <button 
              type="button" 
              onClick={()=>nav(`/emoney/history/${cid}`)}
              style={{
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                background: 'white',
                color: '#374151',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Lihat History
            </button>
          </div>

          {msg && (
            <div style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              color: '#166534',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              ✅ {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
