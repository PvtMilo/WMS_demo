// frontend/src/api/containers.js
import { request } from './client.js';

export function createContainer(payload) {
  return request("POST", "/containers", payload);
}

export function outstandingItems() {
  return request("GET", "/containers/outstanding_items");
}

export function listContainers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/containers" + (qs ? `?${qs}` : ""));
}

export function getContainer(cid) {
  return request("GET", `/containers/${encodeURIComponent(cid)}`);
}

export function updateContainer(cid, payload) {
  return request(
    "POST",
    `/containers/${encodeURIComponent(cid)}/update_meta`,
    payload
  );
}

export function containerMetrics() {
  return request("GET", "/containers/metrics");
}

export function setContainerStatus(cid, status) {
  return request(
    "POST",
    `/containers/${encodeURIComponent(cid)}/set_status`,
    { status }
  );
}

export function deleteContainer(cid) {
  return request("DELETE", `/containers/${encodeURIComponent(cid)}`);
}

export function addItemsToContainer(cid, payload) {
  return request(
    "POST",
    `/containers/${encodeURIComponent(cid)}/add_items`,
    payload
  );
}

export function voidContainerItem(cid, payload) {
  return request(
    "POST",
    `/containers/${encodeURIComponent(cid)}/void_item`,
    payload
  );
}

export function checkinItem(cid, payload) {
  return request(
    "POST",
    `/containers/${encodeURIComponent(cid)}/checkin`,
    payload
  );
}

export function submitDN(cid) {
  return request("POST", `/containers/${encodeURIComponent(cid)}/submit_dn`);
}

export function getLatestDN(cid) {
  return request("GET", `/containers/${encodeURIComponent(cid)}/dn_latest`);
}

export function getDNVersion(cid, version) {
  return request(
    "GET",
    `/containers/${encodeURIComponent(cid)}/dn/${encodeURIComponent(version)}`
  );
}

export function getDNList(cid) {
  return request("GET", `/containers/${encodeURIComponent(cid)}/dn_list`);
}
