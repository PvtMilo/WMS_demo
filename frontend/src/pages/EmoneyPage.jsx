import React, { useEffect, useState } from 'react'
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

  const pages = Math.max(1, Math.ceil((total||0)/perPage))

  function fmtIDR(c){
    const v = Math.round((c||0)/100)
    return 'Rp. ' + new Intl.NumberFormat('id-ID').format(v)
  }

  async function onDelete(id){
    if (!confirm('Hapus E-Money ini beserta semua transaksinya?')) return
    try{ await api.deleteEmoney(id); await refresh(page) } catch(e){ alert(e.message) }
  }

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={{margin:0}}>E-Money</h2>
        <div>
          <a href="/emoney/history" className="noprint" style={{ textDecoration:'none' }}>
            <button style={{...btn}}>History (Audit)</button>
          </a>
        </div>
      </div>
      <div className="noprint" style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16, marginBottom:12}}>
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <div style={{fontWeight:700, marginBottom:6}}>Tambah E-Money</div>
          <div style={{display:'flex', gap:8}}>
            <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Label (contoh: Emoney 001 CI)" style={{...ipt, flex:1}}/>
            <button onClick={create} style={btn}>Tambah</button>
          </div>
        </div>
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari id/label/status..." style={{...ipt, flex:1}}/>
            <button onClick={()=>refresh(1)} style={btn}>Cari</button>
          </div>
        </div>
      </div>

      {msg && <div style={{color:'crimson'}}>{msg}</div>}
      {loading ? 'Memuat…' : (
        <div style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fafafa'}}>
                <th style={th}>ID</th>
                <th style={th}>Label</th>
                <th style={th}>Remaining Balance</th>
                <th style={th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map(e => (
                <tr key={e.id}>
                  <td style={td}>{e.id}</td>
                  <td style={td}>{e.label}</td>
                  <td style={td}>{fmtIDR(e.balance)}</td>
                  <td style={td}>
                    <a href={`/emoney/${e.id}`}>Buka</a>
                    {String(user?.role||'').toLowerCase()==='admin' && (
                      <>
                        {' | '}
                        <button onClick={()=>onDelete(e.id)} style={{...btn, padding:'4px 8px'}}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td style={td} colSpan={4}>Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:12 }}>
        <button style={btn} disabled={page<=1} onClick={()=>setPage(1)}>First</button>
        <button style={btn} disabled={page<=1} onClick={()=>{ const n=Math.max(1,page-1); setPage(n); refresh(n) }}>Prev</button>
        <span>Hal {page} / {pages}</span>
        <button style={btn} disabled={page>=pages} onClick={()=>{ const n=Math.min(pages,page+1); setPage(n); refresh(n) }}>Next</button>
        <button style={btn} disabled={page>=pages} onClick={()=>{ setPage(pages); refresh(pages) }}>Last</button>
      </div>
    </div>
  )
}

