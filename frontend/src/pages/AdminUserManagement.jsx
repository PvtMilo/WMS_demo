import React, { useEffect, useState } from "react";
import { api, getToken } from "../api.js";

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Form state
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("operator");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.listUsers();
      setUsers(res.users || []);
    } catch (e) {
      setErr(e.message || "Gagal memuat user");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setCreating(true);
    try {
      await api.createUser({
        name: newName,
        username: newUsername,
        password: newPass,
        role: newRole,
      });
      setMsg("User berhasil dibuat");
      setNewName("");
      setNewUsername("");
      setNewPass("");
      setNewRole("operator");
      loadUsers();
    } catch (e) {
      setErr(e.message || "Gagal membuat user");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Hapus user "${name}"?`)) return;
    setErr("");
    setMsg("");
    try {
      await api.deleteUser(id);
      setMsg("User dihapus");
      loadUsers();
    } catch (e) {
      setErr(e.message || "Gagal menghapus user");
    }
  }

  if (loading && !users.length) return <div>Loading users...</div>;

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>User Management</h3>

      {err && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fee",
            color: "#c00",
            borderRadius: 8,
            marginBottom: 16,
            border: "1px solid #fcc",
          }}
        >
          {err}
        </div>
      )}
      {msg && (
        <div
          style={{
            padding: "10px 14px",
            background: "#efe",
            color: "#090",
            borderRadius: 8,
            marginBottom: 16,
            border: "1px solid #cfc",
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* List Users */}
        <div style={{ flex: 2, minWidth: 300 }}>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              border: "1px solid #eee",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        Joined: {u.created_at?.slice(0, 10)}
                      </div>
                    </td>
                    <td style={tdStyle}>{u.username}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: roleColor(u.role),
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        style={{
                          border: "none",
                          background: "none",
                          color: "#d32f2f",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "#888",
                      }}
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Form */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              border: "1px solid #eee",
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>Add New User</h4>
            <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={inputStyle}
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  required
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={inputStyle}
                  placeholder="username"
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  required
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  style={inputStyle}
                  placeholder="******"
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={inputStyle}
                >
                  <option value="operator">Operator</option>
                  <option value="pic">PIC</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                style={{
                  marginTop: 8,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  background: "#000",
                  color: "white",
                  fontWeight: 600,
                  cursor: creating ? "default" : "pointer",
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "#555",
};

const tdStyle = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#333",
};

const labelStyle = {
  display: "block",
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: "#444",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
  boxSizing: "border-box",
};

function roleColor(role) {
  switch (role) {
    case "admin":
      return "#e0f2fe"; // light blue
    case "pic":
      return "#fef3c7"; // light yellow
    default:
      return "#f3f4f6"; // gray
  }
}
