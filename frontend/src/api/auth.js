// frontend/src/api/auth.js
import { request, saveToken, clearToken, API_BASE } from './client.js';

export async function login(username, password) {
  let res;
  try {
    res = await fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Login gagal");
  if (data?.token) saveToken(data.token);
  return data; // { token, user }
}

export function me() {
  return request("GET", "/auth/me");
}

export async function logout() {
  try {
    await request("POST", "/auth/logout", {});
  } finally {
    clearToken();
  }
  return { ok: true };
}

export function listUsers() {
  return request("GET", "/auth/users");
}

export function createUser(payload) {
  return request("POST", "/auth/users", payload);
}

export function deleteUser(id) {
  return request("DELETE", `/auth/users/${encodeURIComponent(id)}`);
}
