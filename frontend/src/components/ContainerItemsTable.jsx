import React, { useState } from 'react'
import { formatDateTime } from '../utils/date.js'
import { api } from '../api.js'

export default function ContainerItemsTable({ cid, batches = {}, onVoid, onUpdated, role }) {
  const keys = Object.keys(batches).sort()
  const [editing, setEditing] = useState({})
  if (!keys.length) return <div style={{padding:8, color:'#666'}}>Belum ada item di kontainer ini.</div>

  const isAdmin = String(role || '').toLowerCase() === 'admin'

  const allowedByPrev = (prev, returned, current) => {
    if (!returned) return new Set(['lost'])
    const cur = String(current || prev || 'good').toLowerCase()
    if (cur === 'rusak_berat') return new Set(['rusak_berat','lost'])
    if (cur === 'rusak_ringan') return new Set(['rusak_ringan','rusak_berat','lost'])
    // cur === 'good'
    return new Set(['good','rusak_ringan','rusak_berat','lost'])
  }

  return (
    <div style={{display:'grid', gap:16}}>
      {keys.map(key => (
        <div key={key} style={{border:'1px solid #eee', borderRadius:12, overflow:'hidden'}}>
          <div style={{padding:'8px 12px', background:'#fafafa', borderBottom:'1px solid #eee'}}>
            <b>{key}</b>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fcfcfc'}}>
                <th style={th}>ID</th>
                <th style={th}>Nama</th>
                <th style={th}>Model</th>
                <th style={th}>Rak</th>
                <th style={th}>Kondisi Out</th>
                <th style={th}>Waktu Out</th>
                <th style={th}>Status</th>
                <th style={th}>Kondisi Return</th>
                <th style={th}>Waktu Return</th>
                <th style={th}>Alasan</th>
                {(onVoid || cid) && <th style={th}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {batches[key].map((it, i) => (
                <tr key={it.id_code + i} style={rowStyle(it)}>
                  <td style={td}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{labelCond(it.condition)}</td>
                  <td style={td}>{formatDateTime(it.added_at, {monthText:true})}</td>
                  <td style={td}>{(it.return_condition==='lost' || it.return_condition==='hilang') ? 'Hilang' : (it.return_condition ? 'Returned' : 'Out')}</td>
                  <td style={td}>
                    {cid && editing[it.id_code] ? (
                      (() => {
                        const prev = it.returned_at ? (it.return_condition || 'good') : (it.condition || 'good')
                        const allow = allowedByPrev(prev, !!it.returned_at, it.return_condition)
                        return (
                          <select defaultValue={(it.return_condition || it.condition || 'good')} data-id={it.id_code} style={{padding:6, border:'1px solid #ddd', borderRadius:6}}>
                            <option value="good" disabled={isAdmin ? false : !allow.has('good')}>Good</option>
                            <option value="rusak_ringan" disabled={isAdmin ? false : !allow.has('rusak_ringan')}>Rusak ringan</option>
                            <option value="rusak_berat" disabled={isAdmin ? false : !allow.has('rusak_berat')}>Rusak berat</option>
                            <option value="lost" disabled={isAdmin ? false : !allow.has('lost')}>Hilang</option>
                          </select>
                        )
                      })()
                    ) : (
                      (it.return_condition ? labelCond(it.return_condition) : '-')
                    )}
                  </td>
                  <td style={td}>{(it.return_condition==='lost' || it.return_condition==='hilang') ? '-' : (it.returned_at ? formatDateTime(it.returned_at, {monthText:true}) : '-')}</td>
                  <td style={td}>
                    {cid && editing[it.id_code] ? (
                      <input defaultValue={it.damage_note || ''} placeholder="Alasan (wajib untuk rusak/hilang)" data-note={it.id_code} style={{padding:6, border:'1px solid #ddd', borderRadius:6, width:'100%'}}/>
                    ) : reasonText(it)}
                  </td>
                  {(onVoid || cid) && (
                    <td style={td}>
                      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                        {cid && (!editing[it.id_code] ? (
                          <button type="button" style={{...btnSm, borderColor:'#111'}} onClick={() => setEditing(prev => ({ ...prev, [it.id_code]: true }))}>Update</button>
                        ) : (
                          <button type="button" style={{...btnSm, borderColor:'#111'}} onClick={async () => {
                            const select = document.querySelector(`select[data-id="${it.id_code}"]`)
                            const noteEl = document.querySelector(`input[data-note="${it.id_code}"]`)
                            const cond = (select?.value || 'good')
                            const note = (noteEl?.value || '').trim()
                            const prev = it.returned_at ? (it.return_condition || 'good') : (it.condition || 'good')
                            const allow = allowedByPrev(prev, !!it.returned_at, it.return_condition)
                            let adminOverride = false
                            if (!it.returned_at && cond !== 'lost') {
                              if (isAdmin) { alert('this is admin previleges'); adminOverride = true }
                              else { alert('Item belum kembali. Hanya bisa ditandai Hilang.'); return }
                            }
                            if (!allow.has(cond) && !adminOverride) {
                              if (isAdmin) { if (!confirm('Perubahan ini di luar SOP (admin override). Lanjutkan?')) return }
                              else { alert('Perubahan status tidak diizinkan untuk role Anda.'); return }
                            }
                            if ((cond==='rusak_ringan' || cond==='rusak_berat' || cond==='lost') && !note) { alert('Alasan wajib untuk rusak/hilang'); return }
                            try {
                              await api.checkinItem(cid, { id_code: it.id_code, condition: cond, damage_note: note })
                              setEditing(prev => { const n = { ...prev }; delete n[it.id_code]; return n })
                              onUpdated?.()
                            } catch(e){ alert(e.message) }
                          }}>Save</button>
                        ))}
                        {onVoid && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm(`Batalkan ${it.id_code}?`)) return
                              const reason = prompt('Alasan pembatalan:', 'mis-scan')
                              if (reason === null) return
                              const r = String(reason).trim() || 'mis-scan'
                              onVoid?.(it.id_code, r)
                            }}
                            style={{...btnSm, borderColor:'#c1121f', color:'#c1121f'}}
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

const th = {textAlign:'left', padding:10, borderBottom:'1px solid #eee'}
const td = {padding:10, borderBottom:'1px solid #f2f2f2'}
const btnSm = { padding:'6px 10px', border:'1px solid #ddd', borderRadius:8, background:'#fff', cursor:'pointer' }

function rowStyle(it){
  // Highlight berdasarkan kondisi: gunakan return_condition jika ada, jika tidak pakai condition saat checkout
  const cond = it.return_condition || it.condition
  if (!cond) return {}
  if (cond === 'good') return { background:'#e6ffed' }       // hijau lembut
  if (cond === 'rusak_ringan') return { background:'#fff9c4' } // kuning lembut
  if (cond === 'rusak_berat') return { background:'#ffebee' }   // merah lembut
  if (cond === 'lost' || cond === 'hilang') return { background:'#fdecea' }   // merah tua lembut untuk hilang
  return {}
}
function labelCond(cond){
  if (cond === 'rusak_ringan') return 'Rusak ringan'
  if (cond === 'rusak_berat') return 'Rusak berat'
  if (cond === 'lost' || cond === 'hilang') return 'Hilang'
  return 'Good'
}

function reasonText(it){
  // Prioritas tampilan alasan:
  // 1) Catatan kerusakan saat return
  // 2) Alasan amend (jika batch amend)
  // 3) Alasan override (rusak berat saat checkout)
  if (it.return_condition && it.damage_note) return it.damage_note
  if (it.amend_reason) return it.amend_reason
  if (it.reason) return it.reason
  return '-'
}
