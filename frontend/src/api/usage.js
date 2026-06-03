// frontend/src/api/usage.js
import { request, getToken, API_BASE } from './client.js';

export function usageReportList(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request("GET", "/usage_reports" + (qs ? "?" + qs : ""));
}

export function usageReportDetail(cid) {
  return request("GET", "/usage_reports/" + encodeURIComponent(cid));
}

export function saveUsageReport(cid, payload) {
  return request("POST", "/usage_reports/" + encodeURIComponent(cid), payload);
}

export async function exportUsageReport(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const tok = getToken();
  const res = await fetch(
    API_BASE + "/usage_reports/export" + (qs ? "?" + qs : ""),
    {
      method: "GET",
      headers: tok ? { Authorization: "Token " + tok } : {},
    }
  );
  if (!res.ok) {
    let msg = "Gagal mengunduh laporan usage";
    try {
      const data = await res.json();
      msg = (data && data.message) || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.blob();
}
