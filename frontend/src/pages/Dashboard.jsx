import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getToken } from "../api.js";
import "../styles/layout.css";

function isAdmin(user) {
  const r = user?.role;
  if (!r) return false;
  const s = String(r);
  return s.toLowerCase() === "admin";
}

export default function Dashboard({ children }) {
  const n = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      n("/login");
      return;
    }
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => n("/login"))
      .finally(() => setLoading(false));
  }, []);

  // Ensure body margin is zero while on Dashboard, restore on unmount
  useEffect(() => {
    const prev = document.body.style.margin;
    document.body.style.margin = "0";
    return () => {
      document.body.style.margin = prev;
    };
  }, []);

  async function doLogout() {
    await api.logout();
    n("/login");
  }
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  const gold = "#F2C14E";
  const black = "#000";

  return (
    <div
      className="layout-root"
      style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}
    >
      {/* Left Sidebar */}
      <div
        className={"sidebar"}
        style={{
          background: "white",
          color: black,
          padding: "16px 16px 28px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: "100vh",
          overflowY: "auto",
          flexShrink: 0,
          boxSizing: "border-box",
          borderRadius: "12px",
        }}
      >
        <div className="logo" style={{ margin: "8px 0", textAlign: "left", background: "white" }}>
          <img src="/logo_hitam.png" alt="Logo" style={{ height: "21px", background: "transparent" }} />
        </div>
        <SideButton to="/dashboard" label="DASHBOARD" />
        <SideButton to="/inventory" label="INVENTORY" />
        <SideButton to="/stock" label="STOCK" />
        <SideButton to="/reports/usage" label="REPORT PEMAKAIAN" />
        <SideButton to="/containers" label="CONTAINER" />
        <SideButton to="/checkout" label="CHECK OUT" />
        <SideButton to="/checkin" label="CHECK IN" />
        <SideButton to="/general-checkin" label="GENERAL CHECK-IN" />
        <SideButton to="/maintenance" label="MAINTENANCE" />
        <SideButton to="/emoney" label="EMONEY" />

        {isAdmin(user) && (
          <div style={{ marginTop: 24, background: "white" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, background: "white" }}>ADMIN</div>
            <div style={{ display: "grid", gap: 8, background: "white" }}>
              <div style={{ fontSize: 13, background: "white" }}>
                •{" "}
                <Link style={{ color: black }} to="/admin/data-lifecycle">
                  Admin: Data Lifecycle
                </Link>
              </div>
              <div style={{ fontSize: 13, background: "white" }}>
                •{" "}
                <Link style={{ color: black }} to="/admin/archive">
                  Admin: Archived Browser
                </Link>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={doLogout}
          style={{
            marginTop: "auto",
            marginBottom: 4,
            padding: "8px 12px",
            border: "1px solid " + black,
            borderRadius: 8,
            background: "white",
            color: black,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div
        className={"layout-content"}
        style={{
          flex: 1,
          padding: 24,
          height: "100vh",
          boxSizing: "border-box",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {children ? children : <DashboardHome user={user} />}
      </div>
    </div>
  );
}

function fmtIDR(cents) {
  const v = Math.round((cents || 0) / 100);
  return "Rp. " + new Intl.NumberFormat("id-ID").format(v);
}

function KpiBox({ title, value }) {
  const gold = "#F2C14E";
  const black = "#000";
  return (
    <div
      className="kpi-box"
      style={{
        background: "white",
        color: black,
        borderRadius: 12,
        padding: "20px 16px",
        textAlign: "center",
        border: "1px solid #e5e5e5",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ 
        fontWeight: 500, 
        fontSize: 14, 
        marginBottom: 8,
        color: "#666",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        {title}
      </div>
      <div style={{ 
        fontWeight: 700, 
        fontSize: 28, 
        color: gold,
      }}>
        {value}
      </div>
    </div>
  );
}

function SideButton({ to, label }) {
  const black = "#000";
  return (
    <Link to={to} className="side-btn-link" style={{ textDecoration: "none", background: "white" }}>
      <div
        className="side-btn"
        style={{
          background: "white",
          color: black,
          padding: "10px 12px",
          textAlign: "left",
          fontWeight: 600,
          fontSize: "14px",
          borderBottom: "1px solid #ddd",
        }}
      >
        {label}
      </div>
    </Link>
  );
}

function DashboardHome({ user }) {
  const [kpi, setKpi] = useState({
    open: 0,
    running: 0,
    closed_without_expense: 0,
  });
  const [rusak, setRusak] = useState({ ringan: 0, berat: 0 });
  const [hilang, setHilang] = useState(0);
  const [emoney, setEmoney] = useState([]);
  const gold = "#F2C14E";
  const black = "#000";

  useEffect(() => {
    (async () => {
      try {
        const [m, maint, em, cat] = await Promise.all([
          api.containerMetrics().catch(() => ({})),
          api.maintenanceList({ per_page: 1 }).catch(() => ({})),
          api.listEmoney({ page: 1, per_page: 100 }).catch(() => ({})),
          api.summaryByCategory().catch(() => ({})),
        ]);
        setKpi({
          open: Number(m?.open || 0),
          running: Number(m?.running || 0),
          closed_without_expense: Number(m?.closed_without_expense || 0),
        });
        setRusak({
          ringan: Number(maint?.counts?.ringan || 0),
          berat: Number(maint?.counts?.berat || 0),
        });
        setEmoney(Array.isArray(em?.data) ? em.data : []);
        const list = Array.isArray(cat?.data) ? cat.data : [];
        setHilang(list.reduce((a, r) => a + Number(r?.hilang || 0), 0));
      } catch {}
    })();
  }, []);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p>
        Halo, <b>{user?.name}</b> ({user?.role})
      </p>

      <div
        className="kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "var(--kpi-cols)",
          gap: 24,
          margin: "16px 0 20px",
        }}
      >
        <KpiBox title="Checkout" value={kpi.open} />
        <KpiBox title="Check-in" value={kpi.running} />
        <KpiBox title="Closed" value={kpi.closed_without_expense} />
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e5e5",
        }}
      >
        <div
          style={{
            background: "#f8f9fa",
            color: "#333",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            fontWeight: 600,
            fontSize: 14,
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <div>Nama</div>
          <div>Saldo</div>
          <div>Aksi</div>
        </div>
        <div>
          {(emoney && emoney.length ? emoney : []).map((e, index) => (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                alignItems: "center",
                gap: 16,
                borderBottom: index < emoney.length - 1 ? "1px solid #f0f0f0" : "none",
                padding: "14px 20px",
              }}
            >
              <div style={{ 
                color: black,
                fontWeight: 500,
                fontSize: 14,
              }}>
                {e.label}
              </div>
              <div style={{
                fontWeight: 600,
                color: "#059669",
                fontSize: 14,
              }}>
                {fmtIDR(e.balance)}
              </div>
              <div>
                <Link 
                  to={`/emoney/${e.id}`} 
                  style={{ 
                    color: gold,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 13,
                    padding: "6px 12px",
                    background: "#fff8e1",
                    borderRadius: 6,
                    border: "1px solid #f2c14e",
                    display: "inline-block",
                  }}
                >
                  Lihat emoney
                </Link>
              </div>
            </div>
          ))}
          {(!emoney || emoney.length === 0) && (
            <div style={{ 
              padding: "24px 20px", 
              textAlign: "center",
              color: "#666",
              fontSize: 14,
            }}>
              Belum ada akun E-Money
            </div>
          )}
        </div>
      </div>

      <div
        className="kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "var(--kpi-cols)",
          gap: 24,
        }}
      >
        <KpiBox title="Rusak Ringan" value={rusak.ringan} />
        <KpiBox title="Rusak Berat" value={rusak.berat} />
        <KpiBox title="Hilang" value={hilang} />
      </div>
    </>
  );
}
