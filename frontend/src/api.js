// frontend/src/api.js

// Base URL backend (bisa override via .env Vite: VITE_API_BASE)
const API_BASE = (import.meta?.env?.VITE_API_BASE) || 'http://127.0.0.1:5510'

// ===== Token helpers =====
export function saveToken(token) { localStorage.setItem('token', token) }
export function getToken() { return localStorage.getItem('token') }
export function clearToken() { localStorage.removeItem('token') }

// ===== Core request wrapper (JSON) =====
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const tok = getToken()
  if (tok) headers['Authorization'] = 'Token ' + tok

  let res
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw new Error('Tidak bisa terhubung ke server')
  }

  // 204 No Content
  if (res.status === 204) return {}

  // Coba parse JSON response
  let data = null
  try { data = await res.json() } catch { data = {} }

  if (!res.ok) {
    const msg = data?.message || `Request gagal (${res.status})`
    throw new Error(msg)
  }
  return data
}

// ===== Public API surface =====
export const api = {
  // ---------- AUTH ----------
  async login(email, password) {
    let res
    try {
      res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      throw new Error('Tidak bisa terhubung ke server')
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Login gagal')
    if (data?.token) saveToken(data.token)
    return data // { token, user }
  },

  me() {
    return request('GET', '/auth/me')
  },

  async logout() {
    try { await request('POST', '/auth/logout', {}) } finally { clearToken() }
    return { ok: true }
  },

  // ---------- ITEMS / INVENTORY ----------
  // payload: {prefix, name, category, model, rack, qty}
  batchCreateItems(payload) {
    return request('POST', '/items/batch_create', payload)
  },

  listItems(params = {}) {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/items' + (qs ? `?${qs}` : ''))
  },

  getItem(id_code) {
    return request('GET', `/items/${encodeURIComponent(id_code)}`)
  },

  updateItem(id_code, payload) {
    return request('PUT', `/items/${encodeURIComponent(id_code)}`, payload)
  },

  deleteItem(id_code) {
    return request('DELETE', `/items/${encodeURIComponent(id_code)}`)
  },

  // URL langsung (gambar PNG/SVG QR di-backend)
  qrUrl(id_code) {
    return `${API_BASE}/items/${encodeURIComponent(id_code)}/qr`
  },
  // Lost context for item
  lostContext(id_code) {
    return request('GET', `/items/${encodeURIComponent(id_code)}/lost_context`)
  },

  // ---------- CONTAINERS / CHECKOUT (Phase 4) ----------
  // payload: {event_name, pic, crew?, location?, start_date?, end_date?}
  createContainer(payload) {
    return request('POST', '/containers', payload)
  },

  outstandingItems() {
    return request('GET', '/containers/outstanding_items')
  },
  listContainers(params = {}) {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/containers' + (qs ? `?${qs}` : ''))
  },

  getContainer(cid) {
    return request('GET', `/containers/${encodeURIComponent(cid)}`)
  },

  // Containers metrics for dashboard KPIs
  containerMetrics() {
    return request('GET', '/containers/metrics')
  },

  // Update container status: 'Open' | 'Sedang Berjalan' | 'Closed'
  setContainerStatus(cid, status) {
    return request('POST', `/containers/${encodeURIComponent(cid)}/set_status`, { status })
  },
  deleteContainer(cid) {
    return request('DELETE', `/containers/${encodeURIComponent(cid)}`)
  },

  // payload: { ids: string[], amend?: boolean, override_heavy?: boolean, override_reason?: string }
  addItemsToContainer(cid, payload) {
    return request('POST', `/containers/${encodeURIComponent(cid)}/add_items`, payload)
  },

  // Batalkan (void) item salah input / mis-scan
  // payload: { id_code: string, reason?: string }
  voidContainerItem(cid, payload) {
    return request('POST', `/containers/${encodeURIComponent(cid)}/void_item`, payload)
  },

  // Check-in item returned to warehouse
  // payload: { id_code: string, condition?: string, damage_note?: string }
  checkinItem(cid, payload) {
    return request('POST', `/containers/${encodeURIComponent(cid)}/checkin`, payload)
  },

  // Submit DN -> buat snapshot versi (V1, V2, ...)
  submitDN(cid) {
    return request('POST', `/containers/${encodeURIComponent(cid)}/submit_dn`)
  },

  // Ambil DN snapshot terbaru (untuk print)
  getLatestDN(cid) {
    return request('GET', `/containers/${encodeURIComponent(cid)}/dn_latest`)
  },
  // Ambil DN snapshot tertentu
  getDNVersion(cid, version) {
    return request('GET', `/containers/${encodeURIComponent(cid)}/dn/${encodeURIComponent(version)}`)
  },
  // List semua DN snapshots (audit)
  getDNList(cid) {
    return request('GET', `/containers/${encodeURIComponent(cid)}/dn_list`)
  },
  // Bulk update kondisi item (Good / Rusak ringan / Rusak berat)
  bulkUpdateCondition: (payload) =>
    request('POST', '/items/bulk_update_condition', payload),
  // Tandai item Hilang (Lost) secara manual
  markLost: (ids) => request('POST', '/items/mark_lost', { ids }),
  // Ringkasan jumlah per kategori
  summaryByCategory: () =>
    request('GET', '/items/summary_by_category'),

  // Ringkasan stok per kategori dengan breakdown per model (untuk print)
  inventorySummary: () =>
    request('GET', '/items/summary_by_category_model'),

  // Maintenance: list rusak
  maintenanceList: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/items/maintenance_list' + (qs ? `?${qs}` : ''))
  },
  // Maintenance: repair/update item status
  repairItem: (id_code, note, target='good') => request('POST', '/items/repair', { id_code, note, target }),
  // Maintenance: history
  repairHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/items/repair_history' + (qs ? `?${qs}` : ''))
  },

  // ---------- E-MONEY ----------
  // Create emoney account
  createEmoney: (payload) => request('POST', '/emoney', payload),
  // List emoney
  listEmoney: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/emoney' + (qs ? `?${qs}` : ''))
  },
  // Get emoney detail
  getEmoney: (id) => request('GET', `/emoney/${encodeURIComponent(id)}`),
  // Add transaction (topup/expense)
  addEmoneyTx: (id, payload) => request('POST', `/emoney/${encodeURIComponent(id)}/tx`, payload),
  // Set emoney status (Open/Closed) with validations
  setEmoneyStatus: (id, status) => request('POST', `/emoney/${encodeURIComponent(id)}/set_status`, { status }),
  // Emoney tx by container
  emoneyTxByContainer: (cid) => request('GET', `/emoney/tx_by_container/${encodeURIComponent(cid)}`),
  // Emoney tx by date range (audit)
  emoneyTxRange: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/emoney/tx' + (qs ? `?${qs}` : ''))
  },
  // Delete emoney (only if no transactions)
  deleteEmoney: (id) => request('DELETE', `/emoney/${encodeURIComponent(id)}`),

  // ---------- ADMIN CLEANUP / SNAPSHOT / ARCHIVE ----------
  // Preview cleanup (Fully Closed + E-money scopes) for a time window
  // params: { start, end, include_containers?, include_emoney?, emoney_scope?, container_ids? }
  cleanupPreview: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/admin/cleanup/preview' + (qs ? `?${qs}` : ''))
  },
  // Run cleanup batch (manual)
  // payload: { start, end, include_containers, include_emoney, emoney_scope: string[], container_ids?, note? }
  cleanupRun: (payload) => request('POST', '/admin/cleanup/run', payload),
  // List cleanup batches
  cleanupBatches: () => request('GET', '/admin/cleanup/batches'),
  // Cleanup batch detail
  cleanupBatchDetail: (id) => request('GET', `/admin/cleanup/batches/${encodeURIComponent(id)}`),

  // Snapshots (export/import)
  snapshotCreate: (payload = {}) => request('POST', '/admin/cleanup/snapshots/create', payload),
  snapshotList: () => request('GET', '/admin/cleanup/snapshots'),
  snapshotRestore: (id) => request('POST', `/admin/cleanup/snapshots/${encodeURIComponent(id)}/restore`),

  // Archive browser (read-only)
  archiveBatches: () => request('GET', '/admin/archive/batches'),
  archiveBatchDetail: (id) => request('GET', `/admin/archive/batches/${encodeURIComponent(id)}`),
  archiveContainers: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/admin/archive/containers' + (qs ? `?${qs}` : ''))
  },
  archiveContainerDetail: (id) => request('GET', `/admin/archive/containers/${encodeURIComponent(id)}`),
  archiveEmoneyTx: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', '/admin/archive/emoney/tx' + (qs ? `?${qs}` : ''))
  },
}

export default api
