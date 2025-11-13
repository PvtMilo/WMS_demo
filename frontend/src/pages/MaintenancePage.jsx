import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

export default function MaintenancePage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;
  const [hist, setHist] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [actions, setActions] = useState({}); // { [id_code]: { action:'', note:'' } }
  const [counts, setCounts] = useState({ ringan: 0, berat: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await api.maintenanceList({ q, page, per_page: perPage });
      setList(res.data || []);
      setTotal(res.total || 0);
      setCounts(res.counts || { ringan: 0, berat: 0 });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistLoading(true);
    try {
      const r = await api.repairHistory({ limit: 200 });
      setHist(r.data || []);
    } catch {
      /* ignore */
    } finally {
      setHistLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    loadHistory();
  }, []);
  useEffect(() => {
    refresh();
  }, [page]);
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => list.some((it) => it.id_code === id))
    );
  }, [list]);

  function setRowAction(id_code, patch) {
    setActions((prev) => ({
      ...prev,
      [id_code]: { action: "", note: "", ...(prev[id_code] || {}), ...patch },
    }));
  }
  async function applyRowAction(id_code) {
    const st = actions[id_code] || { action: "", note: "" };
    const a = (st.action || "").toLowerCase();
    if (!a) {
      alert("Pilih aksi terlebih dahulu");
      return;
    }
    const note = (st.note || "").trim();
    if (!note) {
      alert("Catatan penanganan wajib diisi");
      return;
    }
    const target = a === "ringan" ? "rusak_ringan" : a;
    try {
      await api.repairItem(id_code, note, target);
      setRowAction(id_code, { action: "", note: "" });
      await refresh();
      await loadHistory();
    } catch (e) {
      alert(e.message);
    }
  }

  const th = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee" };
  const td = {
    padding: 10,
    borderBottom: "1px solid #f2f2f2",
    verticalAlign: "top",
  };
  const btn = {
    padding: "6px 10px",
    border: "1px solid #111",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  };
  const ipt = { padding: 8, border: "1px solid #ddd", borderRadius: 8 };
  const linkStyle = {
    color: "#1d4ed8",
    textDecoration: "underline",
    fontWeight: 600,
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
  const tdMono = {
    ...tdModern,
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontWeight: 600,
    color: "#4f46e5",
  };

  const filtered = useMemo(() => list, [list]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageSelectedCount = useMemo(
    () =>
      filtered.reduce(
        (acc, it) => acc + (selectedSet.has(it.id_code) ? 1 : 0),
        0
      ),
    [filtered, selectedSet]
  );
  const allOnPageSelected =
    filtered.length > 0 && pageSelectedCount === filtered.length;
  const hasSelection = selectedIds.length > 0;
  const disableDelete = !hasSelection || deleting;
  const pages = Math.max(1, Math.ceil((total || 0) / perPage));
  const actionBtn = (id_code) => {
    const st = actions[id_code] || { action: "", note: "" };
    const disabled = !st.action || !(st.note || "").trim();
    return (
      <div>
        <button
          onClick={() => applyRowAction(id_code)}
          style={{ ...btn, borderColor: "#0a7", color: "#0a7" }}
          disabled={disabled}
        >
          Apply
        </button>
        <button 
        style={{ ...btn ,background: "blue", color: "rgba(255, 255, 255, 1)" }}
        >Edit
        </button>
      </div>
    );
  };
  function optionsFor(it) {
    const opts = [
      { v: "", label: "-- pilih aksi --" },
      { v: "good", label: "Perbaiki → Good" },
    ];
    if (it.defect_level === "berat")
      opts.push({ v: "ringan", label: "Jadikan Rusak ringan" });
    opts.push({ v: "broken", label: "Tandai Broken (Afkir)" });
    return opts;
  }

  function responsibleLink(it) {
    const pic = (it.responsible_pic || "").trim();
    const cid = (it.responsible_container_id || "").trim();
    if (!pic || !cid) return "-";
    return (
      <a href={`/containers/${cid}/checkin`} style={linkStyle}>
        {pic}
      </a>
    );
  }

  function toggleRowSelect(id_code, checked) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id_code);
      else set.delete(id_code);
      return Array.from(set);
    });
  }
  function toggleSelectAllOnPage(checked) {
    if (!filtered.length) return;
    if (checked) {
      const set = new Set(selectedIds);
      filtered.forEach((it) => set.add(it.id_code));
      setSelectedIds(Array.from(set));
    } else {
      const pageIds = new Set(filtered.map((it) => it.id_code));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  }
  async function handleDeleteSelected() {
    if (!selectedIds.length) return;
    if (
      !window.confirm(`Hapus ${selectedIds.length} item terpilih dari daftar?`)
    )
      return;
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await api.deleteItem(id);
      }
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      alert(err.message || "Gagal menghapus sebagian item");
    } finally {
      setDeleting(false);
    }
  }
  async function handleExportMaintenance() {
    if (exporting) return;
    setExporting(true);
    try {
      const perPageAll = 200;
      let pageNum = 1;
      const maintenanceData = [];
      while (true) {
        const res = await api.maintenanceList({
          q,
          page: pageNum,
          per_page: perPageAll,
        });
        const chunk = res.data || [];
        maintenanceData.push(...chunk);
        const totalItems = typeof res.total === "number" ? res.total : null;
        if (
          (totalItems !== null && maintenanceData.length >= totalItems) ||
          chunk.length < perPageAll
        )
          break;
        pageNum += 1;
      }
      const historyData = hist.length
        ? hist
        : (await api.repairHistory({ limit: 500 })).data || [];

      const maintenanceHeaders = [
        "ID",
        "Nama",
        "Kategori",
        "Model",
        "Rak",
        "Level",
        "Kerusakan Terakhir",
        "Penanggungjawab",
      ];
      const maintenanceRows = maintenanceData.map((it) => [
        it.id_code || "",
        it.name || "",
        it.category || "",
        it.model || "",
        it.rack || "",
        it.defect_level || "",
        it.last_damage_note || "-",
        it.responsible_pic && it.responsible_container_id
          ? `${it.responsible_pic} (${it.responsible_container_id})`
          : "-",
      ]);

      const historyHeaders = [
        "Waktu",
        "ID",
        "Nama",
        "Kategori",
        "Model",
        "Status Sebelumnya",
        "Status Sekarang",
        "Kerusakan",
        "Penanganan",
      ];
      const historyRows = historyData.map((r) => [
        r.repaired_at || "",
        r.id_code || "",
        r.name || "-",
        r.category || "-",
        r.model || "-",
        formatStatusPrev(r),
        formatStatusNow(r),
        r.last_damage_note || "-",
        r.repair_note || "-",
      ]);

      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      const buildTable = (title, headers, rows) => {
        const headerRow =
          "<tr>" +
          headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("") +
          "</tr>";
        const bodyRows = rows.length
          ? rows
              .map(
                (row) =>
                  "<tr>" +
                  row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("") +
                  "</tr>"
              )
              .join("")
          : `<tr><td colspan="${
              headers.length
            }" style="text-align:center;">${escapeHtml(
              "Tidak ada data"
            )}</td></tr>`;
        return `
          <h3>${escapeHtml(title)}</h3>
          <table>
            <thead>${headerRow}</thead>
            <tbody>${bodyRows}</tbody>
          </table>
        `;
      };

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
              th, td { border: 1px solid #888; padding: 6px 8px; font-size: 12px; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <h2>Export Maintenance & History</h2>
            ${buildTable(
              "Daftar Maintenance",
              maintenanceHeaders,
              maintenanceRows
            )}
            ${buildTable("History Perbaikan", historyHeaders, historyRows)}
          </body>
        </html>
      `;
      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `maintenance-export-${ts}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Gagal mengekspor data maintenance");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Maintenance</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="exportHistoryAndMaintenance"
            style={{
              ...btn,
              background: "#0f172a",
              color: "#fff",
              borderColor: "#0f172a",
            }}
            onClick={handleExportMaintenance}
            disabled={exporting}
          >
            {exporting ? "Mengekspor..." : "Export ke Excel"}
          </button>
          <a href="/inventory" style={{ fontSize: 13 }}>
            Ke Inventory »
          </a>
        </div>
      </div>
      <div
        className="noprint"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          margin: "8px 0 12px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari id/nama/kategori/model/rak..."
          style={{ ...ipt, flex: 1 }}
        />
        <button onClick={refresh} style={btn}>
          Cari
        </button>
        <button
          onClick={handleDeleteSelected}
          style={{ ...btn, borderColor: "#b91c1c", color: "#b91c1c" }}
          disabled={disableDelete}
        >
          {deleting ? "Menghapus..." : `Hapus (${selectedIds.length})`}
        </button>
        <div style={{ marginLeft: "auto", color: "#333" }}>
          <span
            style={{
              background: "#fff9c4",
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #eee",
            }}
          >
            Ringan: <b>{counts.ringan}</b>
          </span>
          <span
            style={{
              marginLeft: 8,
              background: "#ffebee",
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #eee",
            }}
          >
            Berat: <b>{counts.berat}</b>
          </span>
        </div>
      </div>

      {error && <div style={{ color: "crimson" }}>{error}</div>}
      {loading ? (
        "Memuat…"
      ) : (
        <div
          style={{
            overflow: "auto",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            marginBottom: 16,
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
                <th style={{ ...thModern, width: 50 }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && allOnPageSelected}
                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                    disabled={!filtered.length}
                    aria-label="Pilih semua"
                  />
                </th>
                <th style={thModern}>ID</th>
                <th style={thModern}>Nama</th>
                <th style={thModern}>Kategori</th>
                <th style={thModern}>Model</th>
                <th style={thModern}>Rak</th>
                <th style={thModern}>Level</th>
                <th style={thModern}>Kerusakan Terakhir</th>
                <th style={thModern}>Penanggungjawab</th>
                <th style={thModern}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((it) => (
                  <tr key={it.id_code} style={rowStyleMaintModern(it)}>
                    <td style={{ ...tdModern, width: 50, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(it.id_code)}
                        onChange={(e) =>
                          toggleRowSelect(it.id_code, e.target.checked)
                        }
                        aria-label={`Pilih ${it.id_code}`}
                      />
                    </td>
                    <td style={tdMono}>{it.id_code}</td>
                    <td style={tdModern}>{it.name}</td>
                    <td style={tdModern}>{it.category}</td>
                    <td style={tdModern}>{it.model}</td>
                    <td style={tdModern}>{it.rack}</td>
                    <td style={tdModern}>{it.defect_level}</td>
                    <td style={tdModern}>{it.last_damage_note || "-"}</td>
                    <td style={tdModern}>{responsibleLink(it)}</td>
                    <td style={tdModern}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <select
                            value={actions[it.id_code]?.action || ""}
                            onChange={(e) =>
                              setRowAction(it.id_code, {
                                action: e.target.value,
                              })
                            }
                            style={{ ...ipt, width: 140 }}
                          >
                            {optionsFor(it).map((o) => (
                              <option key={o.v} value={o.v}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {actionBtn(it.id_code)}
                        </div>
                        {actions[it.id_code]?.action &&
                          actions[it.id_code].action !== "delete" && (
                            <input
                              placeholder="Catatan penanganan (wajib)"
                              value={actions[it.id_code]?.note || ""}
                              onChange={(e) =>
                                setRowAction(it.id_code, {
                                  note: e.target.value,
                                })
                              }
                              style={ipt}
                            />
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdModern} colSpan={10}>
                    Tidak ada barang Rusak
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button style={btn} disabled={page <= 1} onClick={() => setPage(1)}>
          First
        </button>
        <button
          style={btn}
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span>
          Hal {page} / {pages}
        </span>
        <button
          style={btn}
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
        >
          Next
        </button>
        <button
          style={btn}
          disabled={page >= pages}
          onClick={() => setPage(pages)}
        >
          Last
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: "8px 0" }}>History Perbaikan (terbaru)</h3>
          <div>
            <button
              className="noprint"
              onClick={loadHistory}
              style={btn}
              disabled={histLoading}
            >
              {histLoading ? "Muat…" : "Refresh"}
            </button>
          </div>
        </div>
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
                <th style={thModern}>Waktu</th>
                <th style={thModern}>ID</th>
                <th style={thModern}>Nama</th>
                <th style={thModern}>Kategori</th>
                <th style={thModern}>Model</th>
                <th style={thModern}>Status Sebelumnya</th>
                <th style={thModern}>Status Sekarang</th>
                <th style={thModern}>Kerusakan</th>
                <th style={thModern}>Penanganan / Hasil</th>
              </tr>
            </thead>
            <tbody>
              {hist.length ? (
                hist.map((r, i) => (
                  <tr key={r.id + "-" + i} style={rowStyleHistModern(r, i)}>
                    <td style={tdModern}>{r.repaired_at}</td>
                    <td style={tdMono}>{r.id_code}</td>
                    <td style={tdModern}>{r.name || "-"}</td>
                    <td style={tdModern}>{r.category || "-"}</td>
                    <td style={tdModern}>{r.model || "-"}</td>
                    <td style={tdModern}>{formatStatusPrev(r)}</td>
                    <td style={tdModern}>{formatStatusNow(r)}</td>
                    <td style={tdModern}>{r.last_damage_note || "-"}</td>
                    <td style={tdModern}>
                      <div>{r.repair_note}</div>
                      <div
                        style={{ fontSize: 12, color: "#666", marginTop: 4 }}
                      >
                        Hasil: {r.result_status || "-"}
                        {r.result_status === "Rusak" && r.result_defect
                          ? ` (${r.result_defect})`
                          : ""}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={tdModern} colSpan={9}>
                    Belum ada history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function rowStyleMaint(it) {
  if (it.defect_level === "ringan") return { background: "#fff9c4" };
  if (it.defect_level === "berat") return { background: "#ffebee" };
  return {};
}
function rowStyleHist(r) {
  if (r.result_status === "Good") return { background: "#e6ffed" };
  if (r.result_status === "Rusak") {
    if (r.result_defect === "ringan") return { background: "#fff9c4" };
    if (r.result_defect === "berat") return { background: "#ffebee" };
  }
  if (r.result_status === "Afkir") return { background: "#eeeeee" };
  return {};
}

// Modern row styles that preserve business logic
function rowStyleMaintModern(it) {
  const baseStyle = {
    transition: "background-color 0.2s ease",
  };

  // Business logic: defect level colors
  if (it.defect_level === "ringan")
    return { ...baseStyle, background: "#fff9c4" };
  if (it.defect_level === "berat")
    return { ...baseStyle, background: "#ffebee" };

  // Default alternating colors for items without defect levels
  return baseStyle;
}

function rowStyleHistModern(r, index) {
  const baseStyle = {
    transition: "background-color 0.2s ease",
  };

  // Business logic: result status colors (higher priority than alternating)
  if (r.result_status === "Good")
    return { ...baseStyle, background: "#e6ffed" };
  if (r.result_status === "Rusak") {
    if (r.result_defect === "ringan")
      return { ...baseStyle, background: "#fff9c4" };
    if (r.result_defect === "berat")
      return { ...baseStyle, background: "#ffebee" };
  }
  if (r.result_status === "Afkir")
    return { ...baseStyle, background: "#eeeeee" };

  // Default alternating colors for other statuses
  return {
    ...baseStyle,
    backgroundColor: index % 2 === 0 ? "#fafbfc" : "white",
  };
}

function formatStatusPrev(r) {
  const st = r.status_before || "-";
  if (st === "Rusak") {
    const d = r.defect_before || "";
    return d ? `${st} (${d})` : st;
  }
  return st || "-";
}
function formatStatusNow(r) {
  const st = r.result_status || "-";
  if (st === "Rusak") {
    const d = r.result_defect || "";
    return d ? `${st} (${d})` : st;
  }
  return st || "-";
}
