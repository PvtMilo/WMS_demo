import React, { useRef, useState } from 'react'
import { api } from '../api.js'

export default function ContainerForm({ onCreated }) {
  const [event_name, setEventName] = useState('')
  const [pic, setPic] = useState('')
  const [crew, setCrew] = useState('')
  const [location, setLocation] = useState('')
  // Input tanggal/waktu terpisah agar mudah mengetik dd/mm/yy
  const [startDateStr, setStartDateStr] = useState('')   // dd/mm/yy atau dd/mm/yyyy
  const [startTime, setStartTime] = useState('')         // HH:mm
  const [endDateStr, setEndDateStr] = useState('')
  const [endTime, setEndTime] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const startDatePickerRef = useRef(null)
  const endDatePickerRef = useRef(null)

  function parseDDMMYY(s){
    if (!s) return ''
    const m = (s || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/)
    if (!m) return ''
    let d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = m[3]
    if (y.length === 2) y = String(2000 + parseInt(y, 10))
    const yyyy = String(y).padStart(4, '0')
    const mm = String(mo).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    // Basic range check
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return ''
    return `${yyyy}-${mm}-${dd}`
  }

  function composeIso(dateStr, timeStr){
    const d = parseDDMMYY(dateStr)
    if (!d) return ''
    const t = (timeStr || '00:00').trim()
    // Validate HH:mm minimal
    const ok = /^\d{2}:\d{2}$/.test(t)
    return `${d}T${ok ? t : '00:00'}`
  }

  function todayDDMMYY(){
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth()+1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}/${mm}/${yy}`
  }

  function pickDate(ref, setter){
    const el = ref?.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      el.showPicker()
    } else {
      el.click()
    }
    // onChange of hidden input will call setter
  }

  async function submit(e){
    e.preventDefault()
    setMsg('')

    // Client-side validation: require all fields completed
    const missing = []
    if (!event_name.trim()) missing.push('Event')
    if (!pic.trim()) missing.push('PIC')
    if (!crew.trim()) missing.push('Crew')
    if (!location.trim()) missing.push('Lokasi')
    if (!startDateStr.trim()) missing.push('Tanggal Mulai')
    if (!startTime.trim()) missing.push('Jam Mulai')
    if (!endDateStr.trim()) missing.push('Tanggal Selesai')
    if (!endTime.trim()) missing.push('Jam Selesai')

    const invalids = []
    const sd = parseDDMMYY(startDateStr)
    const ed = parseDDMMYY(endDateStr)
    const hhmm = /^\d{2}:\d{2}$/
    if (startDateStr && !sd) invalids.push('Tanggal Mulai (format dd/mm/yy)')
    if (endDateStr && !ed) invalids.push('Tanggal Selesai (format dd/mm/yy)')
    if (startTime && !hhmm.test(startTime)) invalids.push('Jam Mulai (format HH:mm)')
    if (endTime && !hhmm.test(endTime)) invalids.push('Jam Selesai (format HH:mm)')

    if (missing.length || invalids.length) {
      alert(
        'Harap lengkapi form sebelum menyimpan.\n' +
        (missing.length ? ('- Kosong: ' + missing.join(', ') + '\n') : '') +
        (invalids.length ? ('- Format salah: ' + invalids.join(', ')) : '')
      )
      return
    }

    const startIso = composeIso(startDateStr, startTime)
    const endIso = composeIso(endDateStr, endTime)
    if (!startIso || !endIso) {
      alert('Tanggal/Jam tidak valid. Periksa kembali.')
      return
    }
    if (new Date(startIso) > new Date(endIso)) {
      alert('Tanggal/Waktu selesai harus lebih besar atau sama dengan mulai.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        event_name: event_name.trim(),
        pic: pic.trim(),
        crew: crew.trim(),
        location: location.trim(),
        start_date: startIso,
        end_date: endIso,
      }
      const out = await api.createContainer(payload)
      setMsg(`Berhasil buat kontainer: ${out.id}`)
      onCreated?.(out.id)
      setEventName(''); setPic(''); setCrew(''); setLocation('')
      setStartDateStr(''); setStartTime(''); setEndDateStr(''); setEndTime('')
    } catch (e) { setMsg(e.message) }
    finally { setLoading(false) }
  }

  const ipt = { padding:8, border:'1px solid #ddd', borderRadius:8, width:'100%' }
  const row = { display:'flex', gap:6, alignItems:'center' }
  const tinyBtn = { padding:'6px 8px', border:'1px solid #ddd', background:'#fff', borderRadius:6, cursor:'pointer' }
  const group = { display:'grid', gap:6, padding:12, border:'1px solid #eee', borderRadius:8, background:'#fafafa' }
  const label = { fontSize:12, color:'#555' }

  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, padding:16, border:'1px solid #eee', borderRadius:12}}>
      <h3>Buat Kontainer / Event</h3>
      <label>Event <input value={event_name} onChange={e=>setEventName(e.target.value)} style={ipt} required/></label>
      <label>PIC <input value={pic} onChange={e=>setPic(e.target.value)} style={ipt} required/></label>
      <label>Crew <input value={crew} onChange={e=>setCrew(e.target.value)} style={ipt} required/></label>
      <label>Lokasi <input value={location} onChange={e=>setLocation(e.target.value)} style={ipt} required/></label>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div style={group}>
          <div style={label}>Mulai</div>
          <div style={row}>
            <input placeholder="dd/mm/yy" value={startDateStr} onChange={e=>setStartDateStr(e.target.value)} style={{...ipt, flex:1}} required/>
            <button type="button" onClick={()=>pickDate(startDatePickerRef, setStartDateStr)} title="Pilih tanggal" style={tinyBtn}>📅</button>
            <button type="button" onClick={()=>setStartDateStr(todayDDMMYY())} title="Set hari ini" style={tinyBtn}>Today</button>
            {/* hidden native date input for picker */}
            <input ref={startDatePickerRef} type="date" style={{position:'absolute', opacity:0, width:0, height:0, pointerEvents:'none'}} onChange={(e)=>{
              const v = e.target.value // yyyy-mm-dd
              if (v){
                const [y,m,d] = v.split('-')
                setStartDateStr(`${d}/${m}/${y.slice(-2)}`)
              }
            }} />
          </div>
          <div style={row}>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} style={{...ipt, flex:1}} required/>
            <select value={startTime} onChange={e=>setStartTime(e.target.value)} style={ipt}>
              <option value="">Pilih jam cepat…</option>
              <option>08:00</option>
              <option>09:00</option>
              <option>10:00</option>
              <option>12:00</option>
              <option>13:00</option>
              <option>15:00</option>
              <option>17:00</option>
              <option>20:00</option>
            </select>
          </div>
        </div>
        <div style={group}>
          <div style={label}>Selesai</div>
          <div style={row}>
            <input placeholder="dd/mm/yy" value={endDateStr} onChange={e=>setEndDateStr(e.target.value)} style={{...ipt, flex:1}} required/>
            <button type="button" onClick={()=>pickDate(endDatePickerRef, setEndDateStr)} title="Pilih tanggal" style={tinyBtn}>📅</button>
            <button type="button" onClick={()=>setEndDateStr(todayDDMMYY())} title="Set hari ini" style={tinyBtn}>Today</button>
            {/* hidden native date input for picker */}
            <input ref={endDatePickerRef} type="date" style={{position:'absolute', opacity:0, width:0, height:0, pointerEvents:'none'}} onChange={(e)=>{
              const v = e.target.value // yyyy-mm-dd
              if (v){
                const [y,m,d] = v.split('-')
                setEndDateStr(`${d}/${m}/${y.slice(-2)}`)
              }
            }} />
          </div>
          <div style={row}>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} style={{...ipt, flex:1}} required/>
            <select value={endTime} onChange={e=>setEndTime(e.target.value)} style={ipt}>
              <option value="">Pilih jam cepat…</option>
              <option>08:00</option>
              <option>09:00</option>
              <option>10:00</option>
              <option>12:00</option>
              <option>13:00</option>
              <option>15:00</option>
              <option>17:00</option>
              <option>20:00</option>
            </select>
          </div>
        </div>
      </div>
      <button disabled={loading} style={{padding:'10px 14px'}}>{loading?'Menyimpan…':'Simpan'}</button>
      {msg && <div style={{fontSize:13}}>{msg}</div>}
    </form>
  )
}
