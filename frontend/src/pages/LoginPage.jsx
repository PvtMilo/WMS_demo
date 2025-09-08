import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function LoginPage() {
  const n = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.login(email.trim(), password.trim())
      n('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ipt = {width:'100%', padding:10, border:'1px solid #ccc', borderRadius:8}
  return (
    <div style={{minHeight:'100vh', display:'grid', placeItems:'center', fontFamily:'sans-serif'}}>
      <form onSubmit={onSubmit} style={{width:320, padding:24, border:'1px solid #ddd', borderRadius:12}}>
        <h2 style={{margin:'0 0 12px'}}>Login WMS</h2>
        <div style={{display:'grid', gap:8}}>
          <label>
            <div>Email</div>
            <input autoFocus type="email" value={email} onChange={e=>setEmail(e.target.value)} style={ipt}/>
          </label>
          <label>
            <div>Password</div>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={ipt}/>
          </label>
          {error && <div style={{color:'crimson', fontSize:14}}>{error}</div>}
          <button disabled={loading} style={{padding:'10px 14px', border:'none', borderRadius:8, background:'#111', color:'#fff', cursor:'pointer'}}>
            {loading ? 'Masuk…' : 'Masuk'}
          </button>
        </div>
      </form>
    </div>
  )
}