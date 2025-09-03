import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, getToken } from '../api.js'

function isAdmin(user){
  const r = user?.role
  if (!r) return false
  const s = String(r)
  return s.toLowerCase() === 'admin'
}

export default function Dashboard() {
  const n = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { n('/login'); return }
    api.me().then(d => setUser(d.user)).catch(() => n('/login')).finally(() => setLoading(false))
  }, [])

  async function doLogout(){ await api.logout(); n('/login') }
  if (loading) return <div style={{padding:24}}>Loading...</div>

  return (
    <div style={{padding:24, fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2>Dashboard</h2>
        <button onClick={doLogout} style={{padding:'8px 12px', border:'1px solid #ddd', borderRadius:8, background:'#fff'}}>Logout</button>
      </div>
      <p>Halo, <b>{user?.name}</b> ({user?.role})</p>
      <ul style={{marginTop:16}}>
        <li><Link to="/inventory">Ke Inventory (Pendaftaran + QR)</Link></li>
        <li><Link to="/checkout">Check-Out</Link></li>
        <li><Link to="/checkin">Check-In</Link></li>
        <li><Link to="/containers">Kontainer</Link></li>
        <li><Link to="/maintenance">Maintenance (Rusak + Good)</Link></li>
        <li><Link to="/emoney">E-Money</Link></li>
        {isAdmin(user) && (
          <>
            <li style={{marginTop:8}}><b>Admin</b></li>
            <li><Link to="/admin/data-lifecycle">Admin: Data Lifecycle</Link></li>
            <li><Link to="/admin/archive">Admin: Archived Browser</Link></li>
          </>
        )}
      </ul>
    </div>
  )
}

