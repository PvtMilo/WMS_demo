import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getToken } from '../api.js'

function isAdmin(user){
  const r = user?.role
  if (!r) return false
  const s = String(r)
  return s.toLowerCase() === 'admin'
}

export default function AdminDataLifecycle() {
  const n = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // form state
  const today = new Date()
  const iso = (d) => d.toISOString().slice(0,10)
  const [start, setStart] = useState(iso(new Date(today.getFullYear(), today.getMonth()-1, 1)))
  const [end, setEnd] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [includeContainers, setIncludeContainers] = useState(true)
  const [includeEmoney, setIncludeEmoney] = useState(true)
  const [scopeLinked, setScopeLinked] = useState(true)
  const [scopeAll, setScopeAll] = useState(true)
  const [note, setNote] = useState('')

  const [preview, setPreview] = useState(null)
  const [pvLoading, setPvLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [snapLoading, setSnapLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function boot(){
      if (!getToken()) { n('/login'); return }
      try {
        const me = await api.me()
        if (!isAdmin(me?.user)) { n('/dashboard'); return }
        setUser(me.user)
      } catch {
        n('/login')
        return
      } finally { setLoading(false) }
    }
    boot()
  }, [])

  async function doPreview(){
    setErr(''); setMessage(''); setPreview(null); setPvLoading(true)
    try {
      const params = {
        start, end,
        include_containers: includeContainers ? '1' : '0',
        include_emoney: includeEmoney ? '1' : '0',
        emoney_scope: [scopeLinked && 'linked', scopeAll && 'all'].filter(Boolean).join(','),
      }
      const data = await api.cleanupPreview(params)
      setPreview(data)
    } catch(e){ setErr(e.message || 'Preview gagal') }
    finally { setPvLoading(false) }
  }

  async function doSnapshot(){
    setErr(''); setMessage(''); setSnapLoading(true)
    try {
      const res = await api.snapshotCreate({ note })
      setMessage('Snapshot dibuat: ' + (res?.id || 'OK'))
    } catch(e){ setErr(e.message || 'Snapshot gagal') }
    finally { setSnapLoading(false) }
  }

  async function doRun(){
    setErr(''); setMessage(''); setRunLoading(true)
    try {
      const payload = {
        start, end,
        include_containers: includeContainers,
        include_emoney: includeEmoney,
        emoney_scope: [scopeLinked && 'linked', scopeAll && 'all'].filter(Boolean),
        note,
      }
      const res = await api.cleanupRun(payload)
      setMessage('Cleanup selesai. Batch: ' + (res?.batch_id || 'OK'))
      setPreview(res)
    } catch(e){ setErr(e.message || 'Cleanup gagal') }
    finally { setRunLoading(false) }
  }

  if (loading) return <div style={{padding:24}}>Loading...</div>

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <h2>Admin • Data Lifecycle</h2>
      <div style={{display:'grid', gap:12, maxWidth:680}}>
        <div>
          <label>Start</label>
          <input type="date" value={start} onChange={e=>setStart(e.target.value)} style={{marginLeft:8}} />
          <label style={{marginLeft:16}}>End</label>
          <input type="date" value={end} onChange={e=>setEnd(e.target.value)} style={{marginLeft:8}} />
        </div>
        <div>
          <label><input type="checkbox" checked={includeContainers} onChange={e=>setIncludeContainers(e.target.checked)} /> Containers (Fully Closed)</label>
        </div>
        <div>
          <label><input type="checkbox" checked={includeEmoney} onChange={e=>setIncludeEmoney(e.target.checked)} /> E‑Money History</label>
          <div style={{marginLeft:24, opacity: includeEmoney?1:0.5}}>
            <label style={{marginRight:16}}><input type="checkbox" disabled={!includeEmoney} checked={scopeLinked} onChange={e=>setScopeLinked(e.target.checked)} /> Linked containers only</label>
            <label><input type="checkbox" disabled={!includeEmoney} checked={scopeAll} onChange={e=>setScopeAll(e.target.checked)} /> General (all accounts)</label>
          </div>
        </div>
        <div>
          <label>Note</label>
          <input placeholder="opsional" value={note} onChange={e=>setNote(e.target.value)} style={{marginLeft:8, width:'60%'}}/>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={doPreview} disabled={pvLoading} style={btn()}>{pvLoading?'Preview...':'Preview'}</button>
          <button onClick={doSnapshot} disabled={snapLoading} style={btn()}>{snapLoading?'Snapshot...':'Create Snapshot'}</button>
          <button onClick={doRun} disabled={runLoading} style={btnPrimary()}>{runLoading?'Running...':'Run Cleanup'}</button>
        </div>
        {err && <div style={alertErr()}>{err}</div>}
        {message && <div style={alertOk()}>{message}</div>}
        {preview && (
          <div style={box()}>
            <h4 style={{marginTop:0}}>Preview</h4>
            <pre style={{whiteSpace:'pre-wrap'}}>{safeJson(preview)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

function btn(){ return { padding:'8px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff', cursor:'pointer' } }
function btnPrimary(){ return { ...btn(), background:'#0d6efd', color:'#fff', border:'1px solid #0d6efd' } }
function box(){ return { border:'1px solid #eee', borderRadius:8, padding:12 } }
function alertErr(){ return { ...box(), border:'1px solid #f99', background:'#fee' } }
function alertOk(){ return { ...box(), border:'1px solid #9c9', background:'#efe' } }
function safeJson(o){ try { return JSON.stringify(o,null,2) } catch { return String(o) } }

