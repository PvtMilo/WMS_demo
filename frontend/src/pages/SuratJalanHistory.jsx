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

  if (loading) return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          padding: '24px 32px',
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #F2C14E',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{color: '#374151', fontWeight: 500}}>Memuat riwayat surat jalan...</span>
        </div>
      </div>
    </>
  )
  
  if (error) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        padding: '24px 32px',
        background: 'white',
        borderRadius: 12,
        border: '1px solid #fecaca',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{
          width: 40,
          height: 40,
          background: '#fef2f2',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18
        }}>
          ⚠️
        </div>
        <div>
          <div style={{color: '#dc2626', fontWeight: 600, marginBottom: 4}}>Gagal memuat data</div>
          <div style={{color: '#6b7280', fontSize: 14}}>{error}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:'sans-serif'}}>
      {/* Header Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16}}>
          <button 
            onClick={() => navigate(-1)} 
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: 'white',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            ← Kembali
          </button>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}>
            📋
          </div>
          <h2 style={{margin: 0, color: '#1f2937', fontSize: 24, fontWeight: 700}}>
            Riwayat Surat Jalan
          </h2>
        </div>
        
        <div style={{
          padding: '12px 16px',
          background: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          color: '#1e40af',
          fontSize: 14
        }}>
          📄 Halaman ini menampilkan semua versi Surat Jalan yang pernah dibuat untuk kontainer ini
        </div>
      </div>

      {/* History Table Section */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderBottom: '1px solid #e5e5e5'
        }}>
          <h3 style={{margin: 0, color: '#1f2937', fontSize: 18, fontWeight: 600}}>
            📚 Daftar Versi Surat Jalan
          </h3>
        </div>
        
        <div style={{overflow: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #e5e5e5'
              }}>
                <th style={th}>📝 Versi</th>
                <th style={th}>📅 Dibuat</th>
                <th style={th}>📊 Ringkasan</th>
                <th style={th}>🔗 Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vers.length ? vers.map((v, i) => (
                <tr 
                  key={v.version}
                  style={{
                    backgroundColor: i % 2 === 0 ? '#fafbfc' : 'white',
                    transition: 'background-color 0.2s ease'
                  }}
                  className="table-row-hover"
                >
                  <td style={tdVersion}>V{v.version}</td>
                  <td style={td}>{formatDateTime(v.created_at, {monthText:true})}</td>
                  <td style={td}>{renderSummary(diffs[i])}</td>
                  <td style={td}>
                    <a 
                      href={`/containers/${cid}/surat-jalan/v/${v.version}`}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 6,
                        background: '#F2C14E',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: 12,
                        textDecoration: 'none',
                        display: 'inline-block',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      👁️ Lihat
                    </a>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td style={{...td, textAlign: 'center', color: '#6b7280', fontStyle: 'italic'}} colSpan={4}>
                    📭 Belum ada versi Surat Jalan yang dibuat
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const th = {
  textAlign: 'left',
  padding: '14px 12px',
  borderBottom: '2px solid #e5e5e5',
  whiteSpace: 'nowrap',
  fontWeight: 600,
  fontSize: 14,
  color: '#374151'
}

const td = {
  padding: '12px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
  fontSize: 14,
  color: '#1f2937'
}

const tdVersion = {
  ...td,
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontWeight: 600,
  color: '#4f46e5'
}

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
  if (!d) return <span style={{color: '#6b7280', fontStyle: 'italic'}}>-</span>
  
  const parts = []
  if (d.added.length) {
    parts.push(
      <span key="added" style={{
        color: '#059669',
        fontWeight: 500,
        background: '#ecfdf5',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 12
      }}>
        ➕ {d.added.length} item
      </span>
    )
  }
  if (d.removed.length) {
    parts.push(
      <span key="removed" style={{
        color: '#dc2626',
        fontWeight: 500,
        background: '#fef2f2',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 12
      }}>
        ➖ {d.removed.length} item
      </span>
    )
  }
  if (d.changed.length) {
    parts.push(
      <span key="changed" style={{
        color: '#d97706',
        fontWeight: 500,
        background: '#fffbeb',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 12
      }}>
        🔄 {d.changed.length} item
      </span>
    )
  }
  
  if (!parts.length) {
    return (
      <span style={{
        color: '#6b7280',
        fontWeight: 500,
        background: '#f3f4f6',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 12
      }}>
        ✅ Tidak ada perubahan
      </span>
    )
  }
  
  return (
    <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
      {parts}
    </div>
  )
}

