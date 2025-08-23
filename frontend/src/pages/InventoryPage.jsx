import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import ItemForm from '../components/ItemForm.jsx'
import ItemTable from '../components/ItemTable.jsx'
import QrModal from '../components/QrModal.jsx'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [qrId, setQrId] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true); setError('')
    try {
      const data = await api.listItems(q ? { q } : {})
      setItems(data.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const ipt = {flex:1, padding:8, border:'1px solid #ddd', borderRadius:8}
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>Inventory</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:24 }}>
        <div>
          <ItemForm onCreated={refresh}/>
        </div>
        <div>
          <div style={{marginBottom:8, display:'flex', gap:8}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari id/nama/model..." style={ipt}/>
            <button onClick={refresh} style={{padding:'8px 12px'}}>Cari</button>
          </div>
          {error && <div style={{color:'crimson'}}>{error}</div>}
          {loading ? 'Loading…' : <ItemTable items={items} onShowQr={setQrId} />}
        </div>
      </div>
      {qrId && <QrModal idCode={qrId} onClose={() => setQrId(null)} />}
    </div>
  )
}