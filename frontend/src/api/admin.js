// frontend/src/api/admin.js
import { request } from './client.js';

export function cleanupPreview(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/admin/cleanup/preview" + (qs ? `?${qs}` : ""));
}

export function cleanupRun(payload) {
  return request("POST", "/admin/cleanup/run", payload);
}

export function cleanupBatches() {
  return request("GET", "/admin/cleanup/batches");
}

export function cleanupBatchDetail(id) {
  return request("GET", `/admin/cleanup/batches/${encodeURIComponent(id)}`);
}

export function snapshotCreate(payload = {}) {
  return request("POST", "/admin/cleanup/snapshots/create", payload);
}

export function snapshotList() {
  return request("GET", "/admin/cleanup/snapshots");
}

export function snapshotRestore(id) {
  return request("POST", `/admin/cleanup/snapshots/${encodeURIComponent(id)}/restore`);
}

export function archiveBatches() {
  return request("GET", "/admin/archive/batches");
}

export function archiveBatchDetail(id) {
  return request("GET", `/admin/archive/batches/${encodeURIComponent(id)}`);
}

export function archiveContainers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/admin/archive/containers" + (qs ? `?${qs}` : ""));
}

export function archiveContainerDetail(id) {
  return request("GET", `/admin/archive/containers/${encodeURIComponent(id)}`);
}

export function archiveEmoneyTx(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/admin/archive/emoney/tx" + (qs ? `?${qs}` : ""));
}

export function fetchActivityLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/activity/logs" + (qs ? `?${qs}` : ""));
}
