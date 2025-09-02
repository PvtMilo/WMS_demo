import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { formatDateTime } from '../utils/date.js'

export default function SuratJalanHistory(){
  const { cid } = useParams()
  const navigate = useNavigate()
  const [vers, setVers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    setLoading(true); setError('')
    api.getDNList(cid)
      .then(r=> setVers(r.versions||[]))
      .catch(e=> setError(e.message))
      .finally(()=> setLoading(false))
  },[cid])

  const diffs = useMemo(()=> computeDiffs(vers), [vers])

  if (loading) return <div style={{padding:24}}>Memuat…</div>
  if (error) return <div style={{padding:24, color:'crimson'}}>{error}</div>

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
        <button onClick={()=>navigate(-1)} style={{padding:'8px 12px'}}>Kembali</button>
        <h2 style={{margin:0}}>Riwayat Surat Jalan</h2>
      </div>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
        <thead>
          <tr style={{background:'#fafafa'}}>
            <th style={th}>Versi</th>
            <th style={th}>Dibuat</th>
            <th style={th}>Ringkasan</th>
            <th style={th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {vers.length ? vers.map((v, i) => (
            <tr key={v.version}>
              <td style={td}>V{v.version}</td>
              <td style={td}>{formatDateTime(v.created_at, {monthText:true})}</td>
              <td style={td}>{renderSummary(diffs[i])}</td>
              <td style={td}><a href={`/containers/${cid}/surat-jalan/v/${v.version}`}>Lihat</a></td>
            </tr>
          )) : (
            <tr><td style={td} colSpan={4}>Belum ada versi DN</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th={textAlign:'left', padding:10, borderBottom:'1px solid #eee'}
const td={padding:10, borderBottom:'1px solid #f2f2f2'}

function computeDiffs(list){
  const out = []
  for (let i=0;i<list.length;i++){
    if (i===0){ out.push({added:[],removed:[],changed:[]}); continue }
    const prev = flatten(list[i-1].payload)
    const curr = flatten(list[i].payload)
    const added=[], removed=[], changed=[]
    for (const k of curr.keys()) if (!prev.has(k)) added.push(k)
    for (const k of prev.keys()) if (!curr.has(k)) removed.push(k)
    for (const k of curr.keys()) if (prev.has(k)){
      const a = prev.get(k), b = curr.get(k)
      const dif = []
      if ((a.condition||'') !== (b.condition||'')) dif.push(`cond: ${a.condition||'-'}→${b.condition||'-'}`)
      if ((a.return_condition||'') !== (b.return_condition||'')) dif.push(`ret: ${a.return_condition||'-'}→${b.return_condition||'-'}`)
      if (dif.length) changed.push(`${k} (${dif.join(', ')})`)
    }
    out.push({added, removed, changed})
  }
  return out
}

function flatten(payload){
  const m = new Map()
  const b = payload?.batches || {}
  for (const key of Object.keys(b)){
    for (const it of b[key]||[]){ m.set(it.id_code, { condition: it.condition, return_condition: it.return_condition }) }
  }
  return m
}

function renderSummary(d){
  if (!d) return '-'
  const parts = []
  if (d.added.length) parts.push(`+${d.added.length} item`)
  if (d.removed.length) parts.push(`-${d.removed.length} item`)
  if (d.changed.length) parts.push(`Δ${d.changed.length} item`)
  if (!parts.length) return 'Tidak ada perubahan'
  return parts.join(' · ')
}

