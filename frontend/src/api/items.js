// frontend/src/api/items.js
import { request, API_BASE } from './client.js';

export function batchCreateItems(payload) {
  return request("POST", "/items/batch_create", payload);
}

export function listItems(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/items" + (qs ? `?${qs}` : ""));
}

export function getItem(id_code) {
  return request("GET", `/items/${encodeURIComponent(id_code)}`);
}

export function updateItem(id_code, payload) {
  return request("PUT", `/items/${encodeURIComponent(id_code)}`, payload);
}

export function deleteItem(id_code) {
  return request("DELETE", `/items/${encodeURIComponent(id_code)}`);
}

export function qrUrl(id_code) {
  return `${API_BASE}/items/${encodeURIComponent(id_code)}/qr`;
}

export function lostContext(id_code) {
  return request("GET", `/items/${encodeURIComponent(id_code)}/lost_context`);
}

export function bulkUpdateCondition(payload) {
  return request("POST", "/items/bulk_update_condition", payload);
}

export function markLost(ids) {
  return request("POST", "/items/mark_lost", { ids });
}

export function summaryByCategory() {
  return request("GET", "/items/summary_by_category");
}

export function inventorySummary() {
  return request("GET", "/items/summary_by_category_model");
}

export function maintenanceList(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/items/maintenance_list" + (qs ? `?${qs}` : ""));
}

export function repairItem(id_code, note, target = "good") {
  return request("POST", "/items/repair", { id_code, note, target });
}

export function updateLastDamage(id_code, note) {
  return request("POST", "/items/update_last_damage", { id_code, note });
}

export function repairHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/items/repair_history" + (qs ? `?${qs}` : ""));
}
