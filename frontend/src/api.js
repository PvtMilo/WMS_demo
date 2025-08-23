const API_BASE = 'http://127.0.0.1:5510'

export function saveToken(token){ localStorage.setItem('token', token) }
export function getToken(){ return localStorage.getItem('token') }
export function clearToken(){ localStorage.removeItem('token') }

async function request(method, path, body){
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type':'application/json',
      'Authorization': 'Token ' + (getToken() || '')
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(()=> ({}))
  if(!res.ok) throw new Error(data.message || 'Request gagal')
  return data
}

export const api = {
  login: async (email, password) => {
    const res = await fetch(API_BASE + '/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email,password})
    })
    const data = await res.json().catch(()=> ({}))
    if(!res.ok) throw new Error(data.message || 'Login gagal')
    saveToken(data.token); return data
  },
  me: () => request('GET', '/auth/me'),
  logout: async () => { await request('POST','/auth/logout',{}); clearToken() },

  // ITEMS
  batchCreateItems: (payload) => request('POST','/items/batch_create', payload),
  listItems: (params={}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/items' + (qs ? `?${qs}` : ''))
  },
  getItem: (id_code) => request('GET', `/items/${encodeURIComponent(id_code)}`),
  updateItem: (id_code, payload) => request('PUT', `/items/${encodeURIComponent(id_code)}`, payload),
  qrUrl: (id_code) => `${API_BASE}/items/${encodeURIComponent(id_code)}/qr`
}