import React from 'react'

export default function ContainerItemsTable({ batches = {}, onVoid }) {
  const keys = Object.keys(batches).sort()
  if (!keys.length) return <div style={{padding:8, color:'#666'}}>Belum ada item di kontainer ini.</div>

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
                <th style={th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {batches[key].map((it, i) => (
                <tr key={it.id_code + i} style={rowStyle(it.return_condition)}>
                  <td style={td}>{it.id_code}</td>
                  <td style={td}>{it.name}</td>
                  <td style={td}>{it.model}</td>
                  <td style={td}>{it.rack}</td>
                  <td style={td}>{labelCond(it.condition)}</td>
                  <td style={td}>{it.added_at}</td>
                  <td style={td}>{it.return_condition ? 'Returned' : 'Out'}</td>
                  <td style={td}>{it.return_condition ? labelCond(it.return_condition) : '-'}</td>
                  <td style={td}>{it.returned_at || '-'}</td>
                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt(`Batalkan ${it.id_code}? Alasan:`, 'mis-scan') || 'mis-scan'
                        onVoid?.(it.id_code, reason)
                      }}
                      style={btn}
                    >
                      Batalkan
                    </button>
                  </td>
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
const btn = { padding:'6px 10px', border:'1px solid #c1121f', borderRadius:8, background:'#fff', color:'#c1121f', cursor:'pointer' }

function rowStyle(cond){
  if (cond === 'rusak_ringan') return { background:'#fff9c4' } // kuning lembut
  if (cond === 'rusak_berat') return { background:'#ffebee' }   // merah lembut
  return {}
}
function labelCond(cond){
  if (cond === 'rusak_ringan') return 'Rusak ringan'
  if (cond === 'rusak_berat') return 'Rusak berat'
  return 'Good'
}
