// frontend/src/api/emoney.js
import { request } from './client.js';

export function createEmoney(payload) {
  return request("POST", "/emoney", payload);
}

export function listEmoney(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/emoney" + (qs ? `?${qs}` : ""));
}

export function getEmoney(id) {
  return request("GET", `/emoney/${encodeURIComponent(id)}`);
}

export function addEmoneyTx(id, payload) {
  return request("POST", `/emoney/${encodeURIComponent(id)}/tx`, payload);
}

export function setEmoneyStatus(id, status) {
  return request("POST", `/emoney/${encodeURIComponent(id)}/set_status`, { status });
}

export function emoneyTxByContainer(cid) {
  return request("GET", `/emoney/tx_by_container/${encodeURIComponent(cid)}`);
}

export function emoneyTxRange(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/emoney/tx" + (qs ? `?${qs}` : ""));
}

export function deleteEmoney(id) {
  return request("DELETE", `/emoney/${encodeURIComponent(id)}`);
}
