import React, { useState } from 'react'
import { api } from '../api.js'

export default function ContainerForm({ onCreated }) {
  const [event_name, setEventName] = useState('')
  const [pic, setPic] = useState('')
  const [crew, setCrew] = useState('')
  const [location, setLocation] = useState('')
  const [start_date, setStart] = useState('')
  const [end_date, setEnd] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e){
    e.preventDefault()
    setMsg(''); setLoading(true)
    try {
      const out = await api.createContainer({ event_name, pic, crew, location, start_date, end_date })
      setMsg(`Berhasil buat kontainer: ${out.id}`)
      onCreated?.(out.id)
      setEventName(''); setPic(''); setCrew(''); setLocation(''); setStart(''); setEnd('')
    } catch (e) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8, width:'100%' }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
      <h3>Buat Kontainer / Event</h3>
      <label>Event <input value={event_name} onChange={e=>setEventName(e.target.value)} style={ipt} required/></label>
      <label>PIC <input value={pic} onChange={e=>setPic(e.target.value)} style={ipt} required/></label>
      <label>Crew <input value={crew} onChange={e=>setCrew(e.target.value)} style={ipt}/></label>
      <label>Lokasi <input value={location} onChange={e=>setLocation(e.target.value)} style={ipt}/></label>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        <label>Mulai <input type="datetime-local" value={start_date} onChange={e=>setStart(e.target.value)} style={ipt}/></label>
        <label>Selesai <input type="datetime-local" value={end_date} onChange={e=>setEnd(e.target.value)} style={ipt}/></label>
      </div>
      <button disabled={loading} style={{padding:'10px 14px'}}>{loading?'Menyimpan…':'Simpan'}</button>
      {msg && <div style={{fontSize:13}}>{msg}</div>}
    </form>
  )
}