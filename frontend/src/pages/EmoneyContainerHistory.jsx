import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import '../styles/print.css'

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
  
  const thNew = {
    textAlign: 'left',
    padding: '14px 12px',
    borderBottom: '2px solid #e5e5e5',
    whiteSpace: 'nowrap',
    fontWeight: 600,
    fontSize: 14,
    color: '#374151'
  }

  const tdNew = {
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    fontSize: 14,
    color: '#1f2937'
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

  if (loading) return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          padding: '24px 32px',
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #F2C14E',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{color: '#374151', fontWeight: 500}}>Memuat history e-money...</span>
        </div>
      </div>
    </>
  )
  
  if (error) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        padding: '24px 32px',
        background: 'white',
        borderRadius: 12,
        border: '1px solid #fecaca',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 40,
          height: 40,
          background: '#fef2f2',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18
        }}>
          ⚠️
        </div>
        <div>
          <div style={{color: '#dc2626', fontWeight: 600, marginBottom: 4}}>Gagal memuat data</div>
          <div style={{color: '#6b7280', fontSize: 14}}>{error}</div>
        </div>
      </div>
    </div>
  )

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
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
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
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              📊
            </div>
            <div>
              <h2 style={{margin: '0 0 4px 0', color: '#1f2937', fontSize: 24, fontWeight: 700}}>
                History E-Money
              </h2>
              <div style={{color: '#6b7280', fontSize: 14}}>Container: <strong>{cid}</strong></div>
            </div>
          </div>
          
          <div className="noprint" style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button 
              onClick={()=>window.print()} 
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
              🖨️ Cetak
            </button>
            <button 
              onClick={()=>nav(`/emoney/expense/${cid}`)} 
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: 8,
                background: '#F2C14E',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              💰 Input Pengeluaran
            </button>
            <button 
              onClick={()=>nav('/emoney')} 
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
              🏦 Ke E-Money
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16}}>
          <div style={{
            background: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: 12,
            padding: '16px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#6b7280',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Expense
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#dc2626'
            }}>
              {fmtIDR(data.sum_expense)}
            </div>
          </div>
          
          <div style={{
            background: 'white',
            border: '1px solid #e5e5e5',
            borderRadius: 12,
            padding: '16px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#6b7280',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Topup Terkait
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#059669'
            }}>
              {fmtIDR(data.sum_topup)}
            </div>
          </div>
        </div>
      </div>

      {/* History Table Section */}
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
            📋 Daftar Transaksi E-Money
          </h3>
        </div>
        
        <div style={{overflow: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #e5e5e5'
              }}>
                <th style={thNew}>🕐 Waktu</th>
                <th style={thNew}>🏦 E-Money</th>
                <th style={thNew}>🏷️ Tipe</th>
                <th style={thNew}>💰 Jumlah</th>
                <th style={thNew}>📦 Container</th>
                <th style={thNew}>🎪 Event</th>
                <th style={thNew}>👤 PIC</th>
                <th style={thNew}>📝 Catatan</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length ? data.data.map((t, index) => {
                const isCF = String(t.note || '').toLowerCase().startsWith('archive_carry_forward')
                const isExpense = t.type === 'expense'
                const rowStyle = isCF ? 
                  { background:'#7f1d1d', color:'#fff' } : 
                  { backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white', transition: 'background-color 0.2s ease' }
                
                return (
                  <tr key={t.id} style={rowStyle} className={!isCF ? "table-row-hover" : ""}>
                    <td style={tdNew}>{fmtTS(t.created_at)}</td>
                    <td style={tdNew}>{t.emoney_label || t.emoney_id}</td>
                    <td style={tdNew}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: isExpense ? '#fef2f2' : '#f0fdf4',
                        color: isExpense ? '#dc2626' : '#059669'
                      }}>
                        {isExpense ? '💸 Expense' : '💳 Topup'}
                      </span>
                    </td>
                    <td style={{...tdNew, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontWeight: 600}}>
                      <span style={{color: isExpense ? '#dc2626' : '#059669'}}>
                        {fmtIDR(t.amount_cents)}
                      </span>
                    </td>
                    <td style={tdNew}>
                      <a 
                        href={`/emoney/history/${cid}`}
                        style={{
                          color: '#4f46e5',
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                      >
                        {cid}
                      </a>
                    </td>
                    <td style={tdNew}>{t.event_name || '-'}</td>
                    <td style={tdNew}>{t.pic || '-'}</td>
                    <td style={tdNew}>{t.note || '-'}</td>
                  </tr>
                )
              }) : (
                <tr>
                  <td style={{...tdNew, textAlign: 'center', color: '#6b7280', fontStyle: 'italic'}} colSpan={8}>
                    📭 Belum ada transaksi e-money terkait
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
