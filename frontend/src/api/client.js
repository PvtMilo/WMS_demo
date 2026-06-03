// frontend/src/api/client.js

export const API_BASE = import.meta?.env?.VITE_API_BASE || "http://127.0.0.1:5510";

// ===== Token helpers =====
export function saveToken(token) {
  localStorage.setItem("token", token);
}
export function getToken() {
  return localStorage.getItem("token");
}
export function clearToken() {
  localStorage.removeItem("token");
}

// ===== Core request wrapper (JSON) =====
export async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const tok = getToken();
  if (tok) headers["Authorization"] = "Token " + tok;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error("Tidak bisa terhubung ke server");
  }

  // 204 No Content
  if (res.status === 204) return {};

  // Coba parse JSON response
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data?.message || `Request gagal (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
