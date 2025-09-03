import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getToken } from '../api.js'

function isAdmin(user){
  const r = user?.role
  if (!r) return false
  const s = String(r)
  return s.toLowerCase() === 'admin' || s.toUpperCase() === 'PIC'
}

export default function AdminArchive() {
  const n = useNavigate()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [batches, setBatches] = useState([])
  const [snapshots, setSnapshots] = useState([])

  useEffect(() => {
    async function boot(){
      if (!getToken()) { n('/login'); return }
      try {
        const me = await api.me()
        if (!isAdmin(me?.user)) { n('/dashboard'); return }
      } catch { n('/login'); return }
      try {
        const [bs, ss] = await Promise.all([
          api.cleanupBatches().catch(()=>({batches:[]})),
          api.snapshotList().catch(()=>([])),
        ])
        setBatches(bs?.batches || bs || [])
        setSnapshots(ss?.snapshots || ss || [])
      } catch(e){ setErr(e.message || 'Gagal memuat arsip') }
      finally{ setLoading(false) }
    }
    boot()
  }, [])

  async function doRestore(id){
    if (!id) return
    const ok = window.confirm('Full restore snapshot ini? Tindakan ini berisiko dan perlu maintenance window.')
    if (!ok) return
    try {
      await api.snapshotRestore(id)
      alert('Restore diminta. Silakan cek status di backend/logs.')
    } catch(e){ alert(e.message || 'Restore gagal') }
  }

  if (loading) return <div style={{padding:24}}>Loading...</div>

  const fmtScopes = (s) => {
    if (!s) return '-'
    if (Array.isArray(s)) return s.join(', ')
    if (typeof s === 'object') {
      const parts = []
      if (s.include_containers) parts.push('Containers')
      if (s.include_emoney) {
        const ems = Array.isArray(s.emoney_scope) ? s.emoney_scope.join(', ') : (s.emoney_scope || '-')
        parts.push(`E‑Money (${ems})`)
      }
      return parts.length ? parts.join(' | ') : '-'
    }
    try { return String(s) } catch { return '-' }
  }

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Admin • Archived Browser</h2>
      {err && <div style={alertErr()}>{err}</div>}
      <div style={{display:'grid', gap:16}}>
        <section style={box()}>
          <h3 style={{marginTop:0}}>Cleanup Batches</h3>
          {(!batches || batches.length===0) && <div>Tidak ada batch.</div>}
          {batches && batches.length>0 && (
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={th()}>Batch</th>
                  <th style={th()}>Start</th>
                  <th style={th()}>End</th>
                  <th style={th()}>Scopes</th>
                  <th style={th()}>Created</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, i) => (
                  <tr key={b.id || i}>
                    <td style={td()}>{b.id_display || b.id || b.batch_id || '-'}</td>
                    <td style={td()}>{b.start || '-'}</td>
                    <td style={td()}>{b.end || '-'}</td>
                    <td style={td()}>{fmtScopes(b.scopes)}</td>
                    <td style={td()}>{b.created_at_fmt || b.created_at || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section style={box()}>
          <h3 style={{marginTop:0}}>Snapshots</h3>
          {(!snapshots || snapshots.length===0) && <div>Tidak ada snapshot.</div>}
          {snapshots && snapshots.length>0 && (
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={th()}>Snapshot</th>
                  <th style={th()}>Created</th>
                  <th style={th()}>Note</th>
                  <th style={th()}>Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s, i) => (
                  <tr key={s.id || i}>
                    <td style={td()}>
                      <div>{s.id_display || s.id || '-'}</div>
                      <div style={{fontSize:12, color:'#777'}}>Snapshot #{s.seq || '-'}</div>
                    </td>
                    <td style={td()}>{s.created_at_fmt || s.created_at || '-'}</td>
                    <td style={td()}>{s.note || '-'}</td>
                    <td style={td()}>
                      <button onClick={()=>doRestore(s.id)} style={btn()}>Full Restore</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

function btn(){ return { padding:'6px 10px', border:'1px solid #ddd', borderRadius:6, background:'#fff', cursor:'pointer' } }
function box(){ return { border:'1px solid #eee', borderRadius:8, padding:12 } }
function th(){ return { textAlign:'left', borderBottom:'1px solid #eee', padding:'6px 8px' } }
function td(){ return { borderBottom:'1px solid #f5f5f5', padding:'6px 8px', fontSize:14 } }
function alertErr(){ return { ...box(), border:'1px solid #f99', background:'#fee' } }
