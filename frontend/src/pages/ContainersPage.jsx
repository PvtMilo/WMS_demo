import React, { useEffect, useMemo, useState } from "react";
import { api, getToken } from "../api.js";
import ContainerForm from "../components/ContainerForm.jsx";
import { formatDateTime } from "../utils/date.js";

export default function ContainersPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // '', 'Open', 'Sedang Berjalan', 'Closed', 'FullyClosed'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Admin-only selection state
  const [selected, setSelected] = useState({}); // { [id]: true }
  const selectedIds = useMemo(() => Object.keys(selected), [selected]);
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const deletableOnPage = useMemo(() => items, [items]);
  const allSelectedOnPage =
    deletableOnPage.length > 0 && deletableOnPage.every((c) => selected[c.id]);
  const [delLoading, setDelLoading] = useState(false);

  async function refresh(p = page) {
    setLoading(true);
    setError("");
    try {
      const params = { page: p, per_page: perPage };
      if (q) params.q = q;
      if (statusFilter === "FullyClosed") {
        params.fully_closed = 1;
      } else if (statusFilter) {
        params.status = statusFilter;
      }
      const res = await api.listContainers(params);
      setItems(res.data || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh(page);
  }, [page]);
  useEffect(() => {
    setPage(1);
    refresh(1);
  }, [statusFilter]);
  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const me = await api.me();
          setUser(me.user);
        }
      } catch {}
    })();
  }, []);
  useEffect(() => {
    setSelected({});
  }, [page, q]);

  function toggleOne(id) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const next = { ...prev };
      if (allSelectedOnPage) {
        for (const c of deletableOnPage) delete next[c.id];
      } else {
        for (const c of deletableOnPage) next[c.id] = true;
      }
      return next;
    });
  }

  async function deleteSelected() {
    if (!isAdmin) return;
    const ids = selectedIds;
    if (ids.length === 0) {
      alert("Tidak ada kontainer dipilih");
      return;
    }
    const ok = window.confirm(`Hapus ${ids.length} kontainer terpilih?`);
    if (!ok) return;
    setDelLoading(true);
    let okCount = 0,
      fail = [];
    try {
      for (const id of ids) {
        try {
          await api.deleteContainer(id);
          okCount += 1;
        } catch (e) {
          fail.push({ id, msg: e.message });
        }
      }
      if (fail.length)
        alert(
          `Gagal hapus ${fail.length} kontainer: ` +
            fail.map((f) => `${f.id} (${f.msg})`).join(", ")
        );
      if (okCount > 0) alert(`Berhasil hapus ${okCount} kontainer`);
      setSelected({});
      await refresh(1);
    } finally {
      setDelLoading(false);
    }
  }

  const ipt = { padding: 8, border: "1px solid #ddd", borderRadius: 8 };
  const btn = {
    padding: "8px 12px",
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
  };
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>Kontainer</h2>
      <div style={{ display: "grid", gap: 16 }}>
        {/* Create container form section above filters */}
        <div>
          {!showCreate ? (
            <div
              style={{
                padding: 16,
                border: "1px solid #eee",
                borderRadius: 12,
                background: "#fafafa",
              }}
            >
              <button
                style={{ ...btn, borderColor: "#111" }}
                onClick={() => setShowCreate(true)}
              >
                + Buat Kontainer / Event
              </button>
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Klik untuk membuka form pembuatan kontainer
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0 }}>Form Kontainer</h3>
                <button style={btn} onClick={() => setShowCreate(false)}>
                  Tutup
                </button>
              </div>
              <ContainerForm
                onCreated={() => {
                  setShowCreate(false);
                  refresh(1);
                }}
              />
            </div>
          )}
        </div>

        {/* Filters + table section */}
        <div>
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Status filters */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "", label: "All" },
                { key: "Open", label: "Open" },
                { key: "Sedang Berjalan", label: "Sedang Berjalan" },
                { key: "Closed", label: "Closed" },
                { key: "FullyClosed", label: "Fully Closed" },
              ].map((s) => (
                <button
                  key={s.key || "all"}
                  onClick={() => setStatusFilter(s.key)}
                  style={{
                    ...btn,
                    padding: "6px 10px",
                    ...(statusFilter === s.key
                      ? {
                          background: "#111",
                          color: "#fff",
                          borderColor: "#111",
                        }
                      : {}),
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari id/event/pic/lokasi..."
              style={{ ...ipt, flex: 1 }}
            />
            <button
              onClick={() => {
                setPage(1);
                refresh(1);
              }}
              style={{ ...btn }}
            >
              Cari
            </button>
          </div>
          {isAdmin && (
            <div
              style={{
                marginBottom: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>
                Dipilih: <b>{selectedIds.length}</b>
              </span>
              <button
                onClick={() => setSelected({})}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "#fff",
                }}
              >
                Clear
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedIds.length === 0 || delLoading}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #c00",
                  color: "#c00",
                  borderRadius: 6,
                  background: "#fff",
                }}
              >
                {delLoading ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          )}
          {error && <div style={{ color: "crimson" }}>{error}</div>}
          {loading ? (
            "Loading…"
          ) : (
            <div>
              <div
                style={{
                  overflow: "auto",
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  backgroundColor: "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        background:
                          "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                        borderBottom: "2px solid #e5e5e5",
                      }}
                    >
                      {isAdmin && (
                        <th style={th}>
                          <input
                            type="checkbox"
                            checked={allSelectedOnPage}
                            onChange={toggleAll}
                            style={{
                              transform: "scale(1.1)",
                              accentColor: "#F2C14E",
                            }}
                          />
                        </th>
                      )}
                      <th style={th}>ID</th>
                      <th style={th}>Event</th>
                      <th style={th}>PIC</th>
                      <th style={th}>Lokasi</th>
                      <th style={th}>Mulai</th>
                      <th style={th}>Selesai</th>
                      <th style={th}>Status</th>
                      <th style={th}>E-Money</th>
                      <th style={th}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length ? (
                      items.map((c, index) => (
                        <tr
                          key={c.id}
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#fafbfc" : "white",
                            transition: "background-color 0.2s ease",
                          }}
                          className="table-row-hover"
                        >
                          {isAdmin && (
                            <td style={td}>
                              <input
                                type="checkbox"
                                checked={!!selected[c.id]}
                                onChange={() => toggleOne(c.id)}
                                style={{
                                  transform: "scale(1.1)",
                                  accentColor: "#F2C14E",
                                }}
                              />
                            </td>
                          )}
                          <td style={tdMono}>{c.id}</td>
                          <td style={td}>{c.event_name}</td>
                          <td style={td}>{c.pic}</td>
                          <td style={td}>{c.location || "-"}</td>
                          <td style={td}>
                            {formatDateTime(c.start_date, { monthText: true })}
                          </td>
                          <td style={td}>
                            {formatDateTime(c.end_date, { monthText: true })}
                          </td>
                          <td style={td}>
                            {c.status}
                            {c.status === "Closed" &&
                            (c.emoney_expenses || 0) > 0
                              ? " · Fully Closed"
                              : ""}
                          </td>
                          <td style={td}>
                            {(c.emoney_expenses || 0) > 0
                              ? "Recorded"
                              : "Pending"}
                          </td>
                          <td style={td}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {c.status === "Open" && (
                                <a
                                  href={`/containers/${c.id}/checkout`}
                                  style={btnPrimary}
                                >
                                  Checkout
                                </a>
                              )}
                              {c.status === "Sedang Berjalan" && (
                                <a
                                  href={`/containers/${c.id}/checkin`}
                                  style={btnPrimary}
                                >
                                  Check-In
                                </a>
                              )}
                              {c.status === "Closed" && (
                                <>
                                  <a
                                    href={`/containers/${c.id}/checkin`}
                                    style={btnSecondary}
                                  >
                                    Lihat
                                  </a>
                                  <a
                                    href={`/emoney/expense/${c.id}`}
                                    style={{
                                      ...((c.emoney_expenses || 0) > 0
                                        ? btnSecondary
                                        : btnDanger),
                                    }}
                                    title={
                                      (c.emoney_expenses || 0) > 0
                                        ? "Sudah ada pengeluaran"
                                        : ""
                                    }
                                  >
                                    Input E-Money
                                  </a>
                                  <a
                                    href={`/emoney/history/${c.id}`}
                                    style={btnSecondary}
                                  >
                                    History E-Money
                                  </a>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={td} colSpan={isAdmin ? 10 : 9}>
                          Belum ada kontainer
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: "6px 12px" }}
                >
                  Prev
                </button>
                <div>
                  Hal {page} / {Math.max(1, Math.ceil(total / perPage))}
                </div>
                <button
                  disabled={page >= Math.ceil(total / perPage)}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: "6px 12px" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const th = {
  textAlign: "left",
  padding: "14px 12px",
  borderBottom: "2px solid #e5e5e5",
  whiteSpace: "nowrap",
  fontWeight: 600,
  fontSize: 14,
  color: "#374151",
};
const td = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  fontSize: 14,
  color: "#1f2937",
};
const tdMono = {
  ...td,
  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  fontWeight: 600,
  color: "#4f46e5",
};
const btnPrimary = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 6,
  background: "#F2C14E",
  color: "white",
  fontWeight: 500,
  fontSize: 12,
  textDecoration: "none",
  display: "inline-block",
  cursor: "pointer",
  transition: "all 0.2s ease",
};
const btnSecondary = {
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "white",
  color: "#374151",
  fontWeight: 500,
  fontSize: 12,
  textDecoration: "none",
  display: "inline-block",
  cursor: "pointer",
  transition: "all 0.2s ease",
};
const btnDanger = {
  padding: "6px 12px",
  border: "1px solid #ef4444",
  borderRadius: 6,
  background: "white",
  color: "#ef4444",
  fontWeight: 500,
  fontSize: 12,
  textDecoration: "none",
  display: "inline-block",
  cursor: "pointer",
  transition: "all 0.2s ease",
};
