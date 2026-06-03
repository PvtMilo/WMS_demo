// frontend/src/api/stock.js
import { request } from './client.js';

export function listStock(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/stock" + (qs ? `?${qs}` : ""));
}

export function stockSummary() {
  return request("GET", "/stock/summary_by_category");
}

export function createStock(payload) {
  return request("POST", "/stock", payload);
}

export function restockStock(id, payload) {
  return request("POST", `/stock/${encodeURIComponent(id)}/restock`, payload);
}

export function updateStock(id, payload) {
  return request("PUT", `/stock/${encodeURIComponent(id)}`, payload);
}

export function deleteStock(id) {
  return request("DELETE", `/stock/${encodeURIComponent(id)}`);
}

export function deleteStockBulk(ids) {
  return request("POST", "/stock/bulk_delete", { ids });
}
