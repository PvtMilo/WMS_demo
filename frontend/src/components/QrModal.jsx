import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function QrModal({ idCode, onClose }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    const url = api.qrUrl(idCode)
    fetch(url, { headers: { 'Authorization': 'Token ' + (localStorage.getItem('token') || '') } })
      .then(r => r.blob())
      .then(b => setSrc(URL.createObjectURL(b)))
  }, [idCode])

  return (
    <div style={wrap}>
      <div style={card}>
        <h3>QR {idCode}</h3>
        {src ? <img src={src} alt="qr" style={{width:240, height:240, imageRendering:'pixelated'}}/> : 'Loading…'}
        <div style={{display:'flex', gap:8, marginTop:12, justifyContent:'center'}}>
          {src && <a href={src} download={`QR-${idCode}.png`} style={btnDark}>Download PNG</a>}
          <button onClick={() => window.print()} style={btn}>Print</button>
          <button onClick={onClose} style={btn}>Tutup</button>
        </div>
      </div>
    </div>
  )
}

const wrap = {position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'grid', placeItems:'center'}
const card = {background:'#fff', padding:16, borderRadius:12, minWidth:320, textAlign:'center'}
const btn = {padding:'8px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff', cursor:'pointer'}
const btnDark = {padding:'8px 12px', border:'1px solid #111', borderRadius:8, background:'#111', color:'#fff', textDecoration:'none', cursor:'pointer'}