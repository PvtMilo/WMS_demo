import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.fetchActivityLogs({ username: filterUser });
      setLogs(res.logs || []);
    } catch (e) {
      setErr(e.message || "Gagal memuat log aktivitas");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadLogs();
  }

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        padding: 20,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0, color: "#333" }}>Activity Log</h2>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Filter by Username..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 14,
              width: 200,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#000",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {err && (
        <div
          style={{
            padding: 16,
            background: "#fee",
            color: "#c00",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {err}
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #eee",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{ background: "#f9fafb", borderBottom: "1px solid #eee" }}
            >
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Target</th>
              <th style={thStyle}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    {log.timestamp?.replace("T", " ")}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500 }}>
                    {log.username || "SYSTEM"}
                  </div>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      background: getActionColor(log.action),
                      color: "#333",
                    }}
                  >
                    {log.action}
                  </span>
                </td>
                <td style={tdStyle}>{log.target || "-"}</td>
                <td style={tdStyle}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#555",
                      maxWidth: 400,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={log.details}
                  >
                    {log.details || "-"}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: 32, textAlign: "center", color: "#888" }}
                >
                  No activity logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

function getActionColor(action) {
  if (action.includes("CREATE")) return "#dcfce7"; // green
  if (action.includes("DELETE")) return "#fee2e2"; // red
  if (action.includes("UPDATE")) return "#e0f2fe"; // blue
  return "#f3f4f6"; // gray
}
