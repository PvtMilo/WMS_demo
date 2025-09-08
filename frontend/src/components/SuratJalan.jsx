import React from "react";

/**
 * SuratJalan.jsx – React A4 Delivery Note (multi‑page safe, WMS‑ready)
 *
 * Goals met:
 * 1) Format setara contoh (header, 2 kolom info, tabel barang, blok kondisi/status/report, catatan, tanda tangan).
 * 2) Multi‑page: tabel tidak terbelah barisnya, header tabel mengulang tiap halaman.
 * 3) Tanda tangan dijamin di HALAMAN TERAKHIR bagian BAWAH (dibuat pada page terpisah, ditempatkan fleksibel ke bawah).
 * 4) Entry Description terbatas ke "out" atau "in" saja → ditampilkan kapital (OUT/IN).
 * 5) Mudah integrasi dengan WMS: terima prop `dn` dan `items` dari API backend kamu.
 *
 * Pemakaian:
 * <SuratJalan dn={dnObject} items={itemsArray} logoUrl="/logo.png" />
 * - `dnObject` & `itemsArray` mengikuti bentuk pada komentar paling bawah file ini.
 * - Untuk print: tekan Ctrl+P (atau pakai react-to-print di wrapper halaman kamu).
 */

export default function SuratJalan({ dn, items = [], logoUrl }) {
  const safe = (v) => (v === undefined || v === null ? "" : v);
  const crewStr = Array.isArray(dn?.crew) ? dn.crew.join(", ") : safe(dn?.crew);

  // Normalisasi entry/exit description ke IN/OUT saja
  const toInOut = (v) => {
    const s = String(v || "")
      .trim()
      .toLowerCase();
    if (s === "out") return "OUT";
    if (s === "in") return "IN";
    return ""; // kosong jika tidak sesuai, supaya gampang validasi
  };

  return (
    <div className="sj-root">
      {/* Print page setup & anti-berantakan rules */}
      <style>{`
        @page { size: A4; margin: 0mm; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .sj-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif; font-size: 12px; }
        .sj-pad { padding: 8mm 8mm 8mm; }
        .sj-k { color: #000; }
        .sj-line { border: 1px solid #000; }
        .sj-dash { border: 1px dashed #000; }
        .sj-h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; }
        .sj-title { margin: 0; font-size: 15px; letter-spacing: .4px; }

        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .sj-table { font-size: 12px; }
        th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; color: #000; background: transparent; }
        th { background: transparent; font-weight: 700; }
        thead { display: table-header-group; }    /* header ulang tiap halaman */
        tfoot { display: table-footer-group; }    /* bisa dipakai kalau perlu footer */
        tr { page-break-inside: avoid; break-inside: avoid; }  /* jangan belah baris */
        td.wrap { word-break: break-word; }
        td.nowrap { white-space: nowrap; }
        .sj-reason { font-size: 11px; color: #000; }

        /* Utility grid */
        .grid2 { display: grid; grid-template-columns: 120px 1fr; gap: 2px 6px; }
        .grid2 .k { color: #000; }

        /* Section cards */
        .sj-card { border: 1px solid #000; border-radius: 6px; padding: 6px; min-height: auto; }

        /* SIGN SECTION: rapi di bagian bawah dokumen */
        .sj-sign { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .sj-sign .slot { text-align: center; page-break-inside: avoid; break-inside: avoid; }
        .sj-sign .line { margin-top: 48px; border-top: 1px solid #000; padding-top: 4px; font-size: 12px; color: #000; min-height: 56px; }

        /* Pemakaian & Kendaraan block (2 columns, ample write space) */
        .sj-3col {
          --sj-row-label-w: 110px;    /* adjust label width */
          --sj-row-space-h: 24px;     /* adjust write space height */
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .sj-3col .row {
          display: grid;
          grid-template-columns: var(--sj-row-label-w) 1fr;
          align-items: start;
          gap: 2px 6px;
        }
        .sj-fill { border: 1px dashed #000; min-height: 20px; padding: 3px 4px; color: #000; background: transparent; }
        /* Show boxes for handwriting in Pemakaian & Kendaraan */
        .sj-3col .sj-fill { border: 1px dashed #000; padding: 2px 3px; min-height: var(--sj-row-space-h); }

        /* Force black output for Surat Jalan only (screen and print) */
        .sj-root, .sj-root * { color: #000 !important; background: transparent !important; }
        .sj-root th, .sj-root td, .sj-root .sj-card, .sj-root .sj-line, .sj-root .sj-dash { border-color: #000 !important; }
        @media print {
          .sj-root, .sj-root * { color: #000 !important; background: transparent !important; }
          .sj-root th, .sj-root td, .sj-root .sj-card, .sj-root .sj-line, .sj-root .sj-dash { border-color: #000 !important; }
        }
      `}</style>

      {/* PAGE 1..N: Header + Meta + Table + Blocks */}
      <div className="sj-page sj-pad">
        {/* Header */}
        <header
          className="flex items-start justify-between gap-3"
          style={{
            borderBottom: "1px solid #000",
            paddingBottom: 0,
            marginBottom: 0,
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/logo_hitam.png"
              alt="logo"
              style={{ height: 20, objectFit: "contain" }}
            />
          </div>
          <div className="text-right">
            <h1 className="sj-title">SURAT JALAN EVENT</h1>
            <div style={{ color: "#000" }}>
              Nomor: {safe(dn?.number) || "____/CIP/EVT/____"}
            </div>
          </div>
        </header>

        {/* Meta boxes */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="sj-card">
            <h3 className="sj-h3">Detail Event</h3>
            <div className="grid2">
              <div className="k">Nama Event</div>
              <div>{safe(dn?.event_name)}</div>
              <div className="k">Tanggal & Jam Event</div>
              <div>{safe(dn?.event_dt)}</div>
              <div className="k">Tanggal & Jam Loading</div>
              <div>{safe(dn?.loading_dt)}</div>
              <div className="k">Lokasi Event</div>
              <div>{safe(dn?.location)}</div>
              <div className="k">Nama Sales</div>
              <div>{safe(dn?.sales)}</div>
              <div className="k">PIC Crew</div>
              <div>{safe(dn?.pic)}</div>
              <div className="k">Crew</div>
              <div>{crewStr}</div>
            </div>
          </div>
          <div className="sj-card">
            <h3 className="sj-h3">Pemakaian & Kendaraan</h3>
            <div className="sj-3col">
              <div>
                <div className="row">
                  <div className="k">Ribbon Awal</div>
                  <div className="sj-fill">{safe(dn?.ribbon_start)}</div>
                </div>
                <div className="row">
                  <div className="k">Ribbon Akhir</div>
                  <div className="sj-fill">{safe(dn?.ribbon_end)}</div>
                </div>
                <div className="row">
                  <div className="k">Lensa Holo Terpakai</div>
                  <div className="sj-fill">{safe(dn?.holo_lens_used)}</div>
                </div>
                <div className="row">
                  <div className="k">Frame Photo Terpakai</div>
                  <div className="sj-fill">{safe(dn?.frame_used)}</div>
                </div>
                <div className="row">
                  <div className="k">Jenis Mobil</div>
                  <div className="sj-fill">{safe(dn?.car?.type)}</div>
                </div>
                <div className="row">
                  <div className="k">Plat Nomor</div>
                  <div className="sj-fill">{safe(dn?.car?.plate)}</div>
                </div>
                <div className="row">
                  <div className="k">Driver</div>
                  <div className="sj-fill">{safe(dn?.car?.driver)}</div>
                </div>
                <div className="row">
                  <div className="k">E‑Money No.</div>
                  <div className="sj-fill">{safe(dn?.car?.emoney_no)}</div>
                </div>
              </div>
              <div>
                <div className="row">
                  <div className="k">E‑Money Awal/Akhir</div>
                  <div className="sj-fill">
                    {safe(dn?.car?.emoney_start)} {safe(dn?.car?.emoney_end)}
                  </div>
                </div>
                <div className="row">
                  <div className="k">KM Awal/Akhir</div>
                  <div className="sj-fill">
                    {safe(dn?.car?.km_start)} {safe(dn?.car?.km_end)}
                  </div>
                </div>
                <div className="row">
                  <div className="k">Nilai Isi Bensin</div>
                  <div className="sj-fill">{safe(dn?.car?.fuel_value)}</div>
                </div>
                <div className="row">
                  <div className="k">Total Biaya Parkir</div>
                  <div className="sj-fill">{safe(dn?.car?.park_total)}</div>
                </div>
                <div className="row">
                  <div className="k">Total Biaya Tol</div>
                  <div className="sj-fill">{safe(dn?.car?.toll_total)}</div>
                </div>
              </div>
            </div>
            <div className="grid2" style={{ display: "none" }}>
              <div className="k">Ribbon Awal</div>
              <div>{safe(dn?.ribbon_start)}</div>
              <div className="k">Ribbon Akhir</div>
              <div>{safe(dn?.ribbon_end)}</div>
              <div className="k">Lensa Holo Terpakai</div>
              <div>{safe(dn?.holo_lens_used)}</div>
              <div className="k">Frame Photo Terpakai</div>
              <div>{safe(dn?.frame_used)}</div>
              <div className="k">Jenis Mobil</div>
              <div>{safe(dn?.car?.type)}</div>
              <div className="k">Plat Nomor</div>
              <div>{safe(dn?.car?.plate)}</div>
              <div className="k">Driver</div>
              <div>{safe(dn?.car?.driver)}</div>
              <div className="k">E‑Money No.</div>
              <div>{safe(dn?.car?.emoney_no)}</div>
              <div className="k">E‑Money Awal/Akhir</div>
              <div>
                {safe(dn?.car?.emoney_start)} → {safe(dn?.car?.emoney_end)}
              </div>
              <div className="k">KM Awal/Akhir</div>
              <div>
                {safe(dn?.car?.km_start)} → {safe(dn?.car?.km_end)}
              </div>
              <div className="k">Nilai Isi Bensin</div>
              <div>{safe(dn?.car?.fuel_value)}</div>
              <div className="k">Total Biaya Parkir</div>
              <div>{safe(dn?.car?.park_total)}</div>
              <div className="k">Total Biaya Tol</div>
              <div>{safe(dn?.car?.toll_total)}</div>
            </div>
          </div>
        </div>

        {/* Items table */}
        <h3 style={{ margin: "6px 0" }}>List of Delivered Order</h3>
        <table className="sj-table">
          <colgroup>
            <col style={{ width: "20px" }} />
            <col style={{ width: "300px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "50px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "56px" }} />
            <col style={{ width: "56px" }} />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>Description</th>
              <th>Status</th>
              <th>Rak</th>
              <th>Item Code</th>
              <th>Alasan</th>
              <th>
                Entry Description <br />
                <small>OUT / IN</small>
              </th>
              <th>
                Exit Description <br />
                <small>OUT / IN</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td className="wrap">{safe(row.description)}</td>
                <td className="nowrap">
                  {(() => {
                    const s = String(row.condition || "").toLowerCase();
                    if (s === "good") return "Good";
                    if (s === "rusak_ringan") return "Rusak Ringan";
                    if (s === "rusak_berat") return "Rusak Berat";
                    return safe(row.condition) || "-";
                  })()}
                </td>
                <td className="nowrap">{safe(row.rack)}</td>
                <td className="wrap">{safe(row.code)}</td>
                <td className="wrap sj-reason">{safe(row.reason)}</td>
                <td>{toInOut(row.entry_desc)}</td>
                <td>{toInOut(row.exit_desc)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <style>{`
          @media print {
            .sj-page { font-size: 10px; }
            .sj-table { font-size: 10px; }
            th, td { padding: 2px 3px; }
            .sj-title { font-size: 13px; }
            .sj-h3 { font-size: 10px; }
          }
        `}</style>

        {/* Car condition + status/report */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="sj-card">
            <h3 className="sj-h3">Kondisi Mobil</h3>
            <div className="grid2">
              <div className="k">Depan</div>
              <div className="sj-fill">{safe(dn?.car_condition?.front)}</div>
              <div className="k">Belakang</div>
              <div className="sj-fill">{safe(dn?.car_condition?.back)}</div>
              <div className="k">Kanan</div>
              <div className="sj-fill">{safe(dn?.car_condition?.right)}</div>
              <div className="k">Kiri</div>
              <div className="sj-fill">{safe(dn?.car_condition?.left)}</div>
            </div>
          </div>
          <div className="sj-card">
            <h3 className="sj-h3">Status Pembayaran Mobil</h3>
            <div className="sj-fill" style={{ minHeight: 28 }}>
              {safe(dn?.car_payment_status)}
            </div>
            <h3 className="sj-h3" style={{ marginTop: 8 }}>
              Report Pemakaian Akhir Mobil
            </h3>
            <div className="sj-fill" style={{ minHeight: 56 }}>
              {safe(dn?.car_end_report)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="sj-card">
            <h3 className="sj-h3">Report Event</h3>
            <div>{safe(dn?.event_report)}</div>
          </div>
          <div className="sj-card">
            <h3 className="sj-h3">Note untuk Gudang</h3>
            <div>{safe(dn?.warehouse_note)}</div>
          </div>
        </div>

        <div className="sj-card" style={{ marginTop: 8 }}>
          <strong>Note:</strong>
          <div>{safe(dn?.note)}</div>
        </div>
        {/* Tanda Tangan: rapi di bagian akhir (tidak dipaksa halaman baru) */}
        <div style={{ marginTop: 16 }}>
          <h3 className="sj-h3">Tanda Tangan</h3>
          <div className="sj-sign">
            {[
              { label: "Arranged by,", role: "Kepala Gudang" },
              { label: "Received by,", role: "PIC Crew" },
              { label: "Returned by,", role: "Kepala Gudang" },
              { label: "Received by,", role: "PIC Crew" },
            ].map((s, i) => (
              <div className="slot" key={i}>
                <div>{s.label}</div>
                <div className="line">{s.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Kontrak data (WMS → React):
 *
 * // dn (object)
 * {
 *   number, event_name, event_dt, loading_dt, location, sales, pic,
 *   crew: ["Rian","Budi"],
 *   ribbon_start, ribbon_end, holo_lens_used, frame_used,
 *   car: { type, plate, driver, emoney_no, emoney_start, emoney_end, km_start, km_end, fuel_value, park_total, toll_total },
 *   car_condition: { front, back, right, left },
 *   car_payment_status, car_end_report, event_report, warehouse_note, note
 * }
 *
 * // items (array of objects)
 * [{ description, code, qty, unit, entry_desc, exit_desc }]
 * - `entry_desc`/`exit_desc` hanya menerima "out" atau "in" (lower/upper bebas) → ditampilkan sebagai "OUT"/"IN".
 *
 * Contoh integrasi front-end:
 *   useEffect(() => {
 *     fetch(`/api/dn/${dnId}`).then(r => r.json()).then(({ dn, items }) => { setDn(dn); setItems(items); });
 *   }, [dnId]);
 *   return dn ? <SuratJalan dn={dn} items={items} logoUrl="/logo.png" /> : null;
 */
