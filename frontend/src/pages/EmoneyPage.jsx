import React, { useEffect, useState, useMemo } from 'react'
import { api, getToken } from '../api.js'

export default function EmoneyPage(){
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 20
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState(null)

  async function refresh(p = page){
    setLoading(true)
    try{
      const res = await api.listEmoney({ q, page: p, per_page: perPage })
      setItems(res.data || [])
      setTotal(res.total || 0)
      setPage(res.page || p)
    }catch(e){ setMsg(e.message) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ refresh(1) }, [])
  useEffect(()=>{ (async()=>{ try{ if(getToken()){ const me=await api.me(); setUser(me.user) } }catch{} })() }, [])

  async function create(){
    const v = (label || '').trim()
    if (!v) { alert('Label wajib'); return }
    try{
      await api.createEmoney({ label: v })
      setLabel('')
      await refresh(1)
    }catch(e){ alert(e.message) }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8 }
  const btn = { padding:'8px 12px', border:'1px solid #111', borderRadius:8, background:'#fff', cursor:'pointer' }
  const th = { textAlign:'left', padding:10, borderBottom:'1px solid #eee' }
  const td = { padding:10, borderBottom:'1px solid #f2f2f2' }
  
  // Modern table styles
  const thModern = { 
    textAlign: 'left', 
    padding: '14px 12px', 
    borderBottom: '2px solid #e5e5e5', 
    whiteSpace: 'nowrap',
    fontWeight: 600,
    fontSize: 14,
    color: '#374151'
  }
  const tdModern = { 
    padding: '12px', 
    borderBottom: '1px solid #f1f5f9', 
    verticalAlign: 'top',
    fontSize: 14,
    color: '#1f2937'
  }
  const tdMono = { 
    ...tdModern, 
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontWeight: 600,
    color: '#4f46e5'
  }
  const tdMoney = { 
    ...tdModern, 
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontWeight: 600,
    color: '#059669'
  }
  const btnPrimary = { 
    padding: '6px 12px', 
    border: 'none', 
    borderRadius: 6, 
    background: '#F2C14E',
    color: 'white',
    fontWeight: 500,
    fontSize: 12,
    textDecoration: 'none',
    display: 'inline-block',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
  const btnDanger = { 
    padding: '6px 12px', 
    border: '1px solid #ef4444', 
    borderRadius: 6, 
    background: 'white',
    color: '#ef4444',
    fontWeight: 500,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  const pages = Math.max(1, Math.ceil((total||0)/perPage))

  // buat window nomor halaman (maks 7 tombol)
  const pageNumbers = useMemo(() => {
    const maxButtons = 7
    if (pages <= maxButtons) return Array.from({ length: pages }, (_, i) => i + 1)
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, page - half)
    let end = start + maxButtons - 1
    if (end > pages) { end = pages; start = end - maxButtons + 1 }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [pages, page])

  function fmtIDR(c){
    const v = Math.round((c||0)/100)
    return 'Rp. ' + new Intl.NumberFormat('id-ID').format(v)
  }

  async function onDelete(id){
    if (!confirm('Hapus E-Money ini beserta semua transaksinya?')) return
    try{ await api.deleteEmoney(id); await refresh(page) } catch(e){ alert(e.message) }
  }

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
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
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
              💳
            </div>
            <div>
              <h2 style={{margin: '0 0 4px 0', color: '#1f2937', fontSize: 24, fontWeight: 700}}>
                E-Money Management
              </h2>
              <div style={{color: '#6b7280', fontSize: 14}}>Kelola akun e-money dan transaksi</div>
            </div>
          </div>
          
          <div className="noprint">
            <a href="/emoney/history" style={{ textDecoration:'none' }}>
              <button style={{
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
              }}>
                📊 History (Audit)
              </button>
            </a>
          </div>
        </div>

        {/* Action Cards */}
        <div className="noprint" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16}}>
          {/* Add E-Money Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16
            }}>
              <div style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14
              }}>
                ➕
              </div>
              <h3 style={{margin: 0, color: '#1f2937', fontSize: 16, fontWeight: 600}}>
                Tambah E-Money
              </h3>
            </div>
            <div style={{display: 'flex', gap: 12}}>
              <input 
                value={label} 
                onChange={e=>setLabel(e.target.value)} 
                placeholder="Label (contoh: Emoney 001 CI)" 
                style={{
                  flex: 1,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  transition: 'border-color 0.2s ease'
                }}
              />
              <button 
                onClick={create} 
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#059669',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Search Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16
            }}>
              <div style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14
              }}>
                🔍
              </div>
              <h3 style={{margin: 0, color: '#1f2937', fontSize: 16, fontWeight: 600}}>
                Cari E-Money
              </h3>
            </div>
            <div style={{display: 'flex', gap: 12}}>
              <input 
                value={q} 
                onChange={e=>setQ(e.target.value)} 
                placeholder="Cari id/label/status..." 
                style={{
                  flex: 1,
                  padding: 10,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  transition: 'border-color 0.2s ease'
                }}
              />
              <button 
                onClick={()=>refresh(1)} 
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#0ea5e9',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cari
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {msg && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#dc2626',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          ⚠️ {msg}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
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
            minHeight: '200px'
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
              <span style={{color: '#374151', fontWeight: 500}}>Memuat data e-money...</span>
            </div>
          </div>
        </>
      ) : (
        /* E-Money Table */
        <div style={{ 
          overflow: 'auto', 
          border: '1px solid #e5e5e5', 
          borderRadius: 12, 
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginBottom: 24
        }}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #e5e5e5'
              }}>
                <th style={thModern}>ID</th>
                <th style={thModern}>Label</th>
                <th style={thModern}>Remaining Balance</th>
                <th style={thModern}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((e, index) => (
                <tr 
                  key={e.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#fafbfc' : 'white',
                    transition: 'background-color 0.2s ease',
                  }}
                  className="table-row-hover"
                >
                  <td style={tdMono}>{e.id}</td>
                  <td style={tdModern}>{e.label}</td>
                  <td style={tdMoney}>{fmtIDR(e.balance)}</td>
                  <td style={tdModern}>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <a href={`/emoney/${e.id}`} style={btnPrimary}>Buka</a>
                      {String(user?.role||'').toLowerCase()==='admin' && (
                        <button onClick={()=>onDelete(e.id)} style={btnDanger}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td style={tdModern} colSpan={4}>Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btn} disabled={page === 1} onClick={() => setPage(1)}>First</button>
          <button style={btn} disabled={page === 1} onClick={() => { const n = Math.max(1, page - 1); setPage(n); refresh(n) }}>Prev</button>
          {pageNumbers[0] > 1 && <span>…</span>}
          {pageNumbers.map(n => (
            <button
              key={n}
              style={{ ...btn, ...(n === page ? { background: '#111', color: '#fff', borderColor: '#111' } : {}) }}
              onClick={() => { setPage(n); refresh(n) }}
            >
              {n}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < pages && <span>…</span>}
          <button style={btn} disabled={page === pages} onClick={() => { const n = Math.min(pages, page + 1); setPage(n); refresh(n) }}>Next</button>
          <button style={btn} disabled={page === pages} onClick={() => { setPage(pages); refresh(pages) }}>Last</button>
        </div>
      )}
    </div>
  )
}

