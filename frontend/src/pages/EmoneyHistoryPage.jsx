import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import "../styles/print.css";

export default function EmoneyHistoryPage() {
  const nav = useNavigate();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [eid, setEid] = useState("");
  const [type, setType] = useState("");
  const [order, setOrder] = useState("asc");
  const [emoneys, setEmoneys] = useState([]);
  const [data, setData] = useState({ data: [], sum_topup: 0, sum_expense: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Default date range: last 31 days
    const today = new Date();
    const endStr = today.toISOString().slice(0, 10);
    const d2 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = d2.toISOString().slice(0, 10);
    setStart(startStr);
    setEnd(endStr);
  }, []);

  useEffect(() => {
    // load emoney list for dropdown
    api
      .listEmoney({ page: 1, per_page: 100 })
      .then((r) => setEmoneys(r?.data || r || []))
      .catch(() => {});
  }, []);

  const fmtIDR = (c) =>
    "Rp. " + new Intl.NumberFormat("id-ID").format(Math.round((c || 0) / 100));
  const fmtTS = (iso) => {
    if (!iso) return "-";
    try {
      const dt = new Date(iso);
      const s = dt.toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });
      return s.replace(/(\d{2})\.(\d{2})/, "$1:$2") + " Wib";
    } catch {
      return iso;
    }
  };
  // Modern styles following inventory page pattern
  const btn = {
    padding: "8px 12px",
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s ease",
  };
  const linkBtn = {
    ...btn,
    borderColor: "#111",
    textDecoration: "none",
    display: "inline-block",
  };
  const ipt = {
    flex: 1,
    padding: 8,
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
  };

  // Modern table styles
  const thModern = {
    textAlign: "left",
    padding: "14px 12px",
    borderBottom: "2px solid #e5e5e5",
    whiteSpace: "nowrap",
    fontWeight: 600,
    fontSize: 14,
    color: "#374151",
  };
  const tdModern = {
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    fontSize: 14,
    color: "#1f2937",
  };
  const tdMoney = {
    ...tdModern,
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontWeight: 600,
    color: "#059669",
  };

  async function doFetch() {
    setLoading(true);
    setError("");
    try {
      const params = { start, end, order };
      if (eid) params.eid = eid;
      if (type) params.type = type;
      const r = await api.emoneyTxRange(params);
      setData(r);
    } catch (e) {
      setError(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch when both dates are ready
  useEffect(() => {
    if (start && end) doFetch();
  }, [start, end]);

  const net = useMemo(
    () => (data.sum_topup || 0) - (data.sum_expense || 0),
    [data]
  );
  const emap = useMemo(() => {
    const m = {};
    emoneys.forEach((e) => {
      m[e.id] = e.label;
    });
    return m;
  }, [emoneys]);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div className="noprint">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>History E-Money (Audit)</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()} style={linkBtn}>
              Cetak
            </button>
            <button onClick={() => nav("/emoney")} style={linkBtn}>
              Ke E-Money
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {/* Filter Section */}
          <div
            style={{
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 12,
              background: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 12,
              }}
            >
              Filter Transaksi
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 4,
                  }}
                >
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  style={ipt}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 4,
                  }}
                >
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  style={ipt}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 4,
                  }}
                >
                  E-Money
                </label>
                <select
                  value={eid}
                  onChange={(e) => setEid(e.target.value)}
                  style={ipt}
                >
                  <option value="">Semua E-Money</option>
                  {emoneys.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.id} - {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 4,
                  }}
                >
                  Tipe Transaksi
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={ipt}
                >
                  <option value="">Semua Tipe</option>
                  <option value="expense">Expense</option>
                  <option value="topup">Top Up</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 4,
                  }}
                >
                  Urutan
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    style={ipt}
                  >
                    <option value="asc">Terlama dulu</option>
                    <option value="desc">Terbaru dulu</option>
                  </select>
                  <button
                    onClick={doFetch}
                    style={{ ...btn, borderColor: "#111" }}
                  >
                    Filter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          {!loading && data.data && (
            <div
              style={{
                padding: 16,
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                background: "white",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 12,
                }}
              >
                Ringkasan Periode
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    Periode
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {start} s/d {end}
                    {eid && (
                      <div
                        style={{ fontSize: 12, color: "#666", marginTop: 2 }}
                      >
                        E-Money: {eid} ({emap[eid] || "-"})
                      </div>
                    )}
                    {type && (
                      <div
                        style={{ fontSize: 12, color: "#666", marginTop: 2 }}
                      >
                        Tipe: {type}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    Total Top Up
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#059669",
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    }}
                  >
                    {fmtIDR(data.sum_topup)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    Total Expense
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#dc2626",
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    }}
                  >
                    {fmtIDR(data.sum_expense)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    Net Amount
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: net >= 0 ? "#059669" : "#dc2626",
                      fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    }}
                  >
                    {fmtIDR(net)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            color: "crimson",
            marginBottom: 16,
            padding: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
          Memuat data...
        </div>
      ) : (
        <div
          style={{
            overflow: "auto",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            marginTop: 16,
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
                <th style={thModern}>Waktu</th>
                <th style={thModern}>E-Money</th>
                <th style={thModern}>Tipe</th>
                <th style={thModern}>Jumlah</th>
                <th style={thModern}>Container</th>
                <th style={thModern}>Event</th>
                <th style={thModern}>PIC</th>
                <th style={thModern}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {data.data && data.data.length ? (
                data.data.map((t, index) => {
                  const isCF = String(t.note || "")
                    .toLowerCase()
                    .startsWith("archive_carry_forward");
                  const baseStyle = {
                    backgroundColor: index % 2 === 0 ? "#fafbfc" : "white",
                    transition: "background-color 0.2s ease",
                  };
                  const rowStyle = isCF
                    ? { ...baseStyle, background: "#800000", color: "#fff" }
                    : baseStyle;
                  const tdStyle = isCF
                    ? { ...tdModern, color: "#fff" }
                    : tdModern;
                  const tdMoneyStyle = isCF
                    ? { ...tdMoney, color: "#fff" }
                    : tdMoney;

                  return (
                    <tr
                      key={t.id}
                      style={rowStyle}
                      className={!isCF ? "table-row-hover" : ""}
                    >
                      <td style={tdStyle}>{fmtTS(t.created_at)}</td>
                      <td style={tdStyle}>
                        {(t.emoney_label || "-") + " (" + t.emoney_id + ")"}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            background:
                              t.type === "topup" ? "#eaf9f0" : "#fef2f2",
                            color: t.type === "topup" ? "#067a3a" : "#b00020",
                            padding: "3px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            lineHeight: 1.2,
                            fontWeight: 500,
                          }}
                        >
                          {t.type === "topup" ? "Top Up" : "Expense"}
                        </span>
                      </td>
                      <td style={tdMoneyStyle}>{fmtIDR(t.amount_cents)}</td>
                      <td style={tdStyle}>{t.ref_container_id || "-"}</td>
                      <td style={tdStyle}>{t.event_name || "-"}</td>
                      <td style={tdStyle}>{t.pic || "-"}</td>
                      <td style={tdStyle}>{t.note || "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td style={tdModern} colSpan={8}>
                    <div
                      style={{
                        textAlign: "center",
                        padding: 20,
                        color: "#666",
                      }}
                    >
                      Tidak ada transaksi pada periode ini
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
