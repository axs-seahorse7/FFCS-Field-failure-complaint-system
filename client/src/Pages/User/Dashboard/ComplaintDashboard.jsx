import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "../../../services/axios-interceptore/api";
import { useNavigate } from "react-router-dom";
import { Tooltip, Image, Modal } from "antd";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const STATUSES  = ["All", "Open", "Pending", "Resolved"];
const PAGE_SIZE = 10;

const STATUS_CONFIG = {
  Open:     { bg: "rgba(0,122,255,0.12)",   text: "#007AFF", dot: "#007AFF",  border: "rgba(0,122,255,0.25)"   },
  Pending:  { bg: "rgba(255,159,10,0.12)",  text: "#FF9F0A", dot: "#FF9F0A",  border: "rgba(255,159,10,0.25)"  },
  Resolved: { bg: "rgba(52,199,89,0.12)",   text: "#34C759", dot: "#34C759",  border: "rgba(52,199,89,0.25)"   },
};

const COLUMNS = [
  { key: "complaintNo",        label: "Complaint No.",   mono: true  },
  { key: "complaintDate",      label: "Date",            date: true  },
  { key: "customerName",       label: "Customer"                     },
  { key: "commodity",          label: "Commodity"                    },
  { key: "modelName",          label: "Model"                        },
  { key: "defectCategory",     label: "Defect Category"              },
  { key: "defectivePart",      label: "Defective Part"               },
  { key: "defectDetails",      label: "Defect Details"               },
  { key: "symptom",            label: "Symptoms"                     },
  { key: "doa",                label: "DOA"                          },
  { key: "purchaseDate",       label: "Purchase Date",   date: true  },
  { key: "productAging",       label: "Aging",           aging: true },
  { key: "manufacturingPlant", label: "Mfg. Plant"                   },
  { key: "manufacturingDate",  label: "Mfg. Date",       date: true  },
  { key: "city",               label: "City"                         },
  { key: "state",              label: "State"                        },
  { key: "dataBase",           label: "Data Base"                    },
  { key: "status",             label: "Status",          status: true},
  { key: "createdAt",          label: "Created At",      date: true  },
  { key: "imageUrl",           label: "Image",           image: true },
  { key: "videoUrl",           label: "Video",           video: true },
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

/* ─────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span style={{ color: "#8E8E93", fontSize: 11 }}>—</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      border: `1px solid ${cfg.border}`,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      flex: "1 1 130px", minWidth: 120,
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.6)",
      borderRadius: 18, padding: "14px 16px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -12, right: -12, width: 60, height: 60, borderRadius: "50%", background: color, opacity: 0.08 }} />
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#8E8E93", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color, lineHeight: 1, letterSpacing: "-1px" }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#AEAEB2", marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function Skeleton() {
  return (
    <tr style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
      <td style={{ padding: "10px 14px" }}><div style={{ height: 10, width: 20, borderRadius: 6, background: "#F2F2F7" }} /></td>
      {COLUMNS.map((c) => (
        <td key={c.key} style={{ padding: "10px 14px" }}>
          <div style={{ height: 10, borderRadius: 6, background: "#F2F2F7", width: `${40 + Math.random() * 40}%` }} />
        </td>
      ))}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ height: 10, width: 36, borderRadius: 6, background: "#F2F2F7" }} />
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────── */
function EmptyState({ hasFilters }) {
  return (
    <tr>
      <td colSpan={COLUMNS.length + 2} style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 36 }}>{hasFilters ? "🔍" : "📋"}</div>
          <p style={{ fontWeight: 700, color: "#3A3A3C", fontSize: 14, margin: 0 }}>{hasFilters ? "No results found" : "No complaints yet"}</p>
          <p style={{ fontSize: 12, color: "#AEAEB2", margin: 0 }}>{hasFilters ? "Try adjusting your filters" : "Submit your first complaint"}</p>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────
   VIDEO PREVIEW MODAL
───────────────────────────────────────── */
function VideoModal({ videoKey, onClose }) {
  const baseUrl = import.meta.env.VITE_API_URI || "http://localhost:3000";
  const src = videoKey?.startsWith("http") ? videoKey : `${baseUrl}/media/${videoKey}`;
  return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      width={680}
      centered
      title={
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E" }}>Video Preview</span>
      }
      styles={{ body: { padding: "12px 0 0" } }}
    >
      <video
        src={src}
        controls
        autoPlay
        style={{ width: "100%", borderRadius: 10, maxHeight: 400, background: "#000", display: "block" }}
      />
    </Modal>
  );
}

/* ─────────────────────────────────────────
   DETAIL DRAWER
───────────────────────────────────────── */
function DetailDrawer({ complaint, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const h = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  if (!complaint) return null;

  const rows = [
    ["Complaint No.",     complaint.complaintNo,                         true],
    ["Complaint Date",    fmtDate(complaint.complaintDate)],
    ["Created At",        fmtDateTime(complaint.createdAt)],
    ["Customer Name",     complaint.customerName],
    ["Commodity",         complaint.commodity],
    ["Replacement Cat.",  complaint.replacementCategory || ""],
    ["Model Name",        complaint.modelName],
    ["Serial No.",        complaint.serialNo || ""],
    ["Part No.",          complaint.partNo || ""],
    ["Purchase Date",     fmtDate(complaint.purchaseDate)],
    ["DOA",               complaint.doa || ""],
    ["Product Aging",     complaint.productAging != null ? `${complaint.productAging} days` : ""],
    ["Defect Category",   complaint.defectCategory],
    ["Defective Part",    complaint.defectivePart],
    ["Symptom",           complaint.symptom || ""],
    ["Defect Details",    complaint.defectDetails],
    ["Mfg. Plant",        complaint.manufacturingPlant || ""],
    ["Mfg. Date",         fmtDate(complaint.manufacturingDate)],
    ["City / State",      [complaint.city, complaint.state].filter(Boolean).join(", ") || ""],
    ["Data Base",         complaint.dataBase || ""],
    ["Status",            complaint.status, false, true],
    ["Resolved Date",     fmtDate(complaint.resolvedDate) || "Not yet resolved"],
    ["Remarks",           complaint.remarks || "Under investigation"],
  ];

  const sections = [
    { title: "Identity",       rows: rows.slice(0, 3)   },
    { title: "Product Info",   rows: rows.slice(3, 10)  },
    { title: "Defect Details", rows: rows.slice(10, 16) },
    { title: "Manufacturing",  rows: rows.slice(16, 19) },
    { title: "Resolution",     rows: rows.slice(19)     },
  ];

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: visible ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)",
          backdropFilter: visible ? "blur(4px)" : "blur(0px)",
          transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
        width: "min(440px, 100vw)",
        background: "rgba(242,242,247,0.96)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.30s cubic-bezier(0.4,0,0.2,1)",
        borderLeft: "1px solid rgba(255,255,255,0.6)",
      }}>
        {/* Header */}
        <div style={{ background: "black", padding: "20px 20px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#636366", margin: "0 0 4px" }}>Complaint Detail</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "ui-monospace, monospace" }}>{complaint.complaintNo}</p>
              <StatusBadge status={complaint.status} />
            </div>
            <button onClick={handleClose} style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2, transition: "background 0.15s",
            }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Sections */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
          {sections.map((section) => (
            <div key={section.title} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.9px", color: "#8E8E93", margin: "0 0 6px 4px" }}>{section.title}</p>
              <div style={{
                background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)",
                borderRadius: 14, border: "1px solid rgba(255,255,255,0.7)", overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}>
                {section.rows.map(([label, value, mono, isStatus], i) => (
                  <div key={label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", gap: 12,
                    borderBottom: i < section.rows.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#8E8E93", margin: 0, flexShrink: 0, minWidth: 100 }}>{label}</p>
                    {isStatus
                      ? <StatusBadge status={value} />
                      : <p style={{
                          fontSize: 11, fontWeight: 600, margin: 0, textAlign: "right",
                          color: mono ? "#007AFF" : "#1C1C1E",
                          fontFamily: mono ? "ui-monospace, monospace" : "inherit",
                          wordBreak: "break-word", maxWidth: 200,
                        }}>{value || ""}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────── */
export default function ComplaintDashboard({ userEmail }) {
  const [complaints, setComplaints]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [sortKey, setSortKey]           = useState("createdAt");
  const [sortDir, setSortDir]           = useState("desc");
  const searchRef = useRef();
  const navigate  = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const isEdit = state?.isEdit;


  const user = JSON.parse(localStorage.getItem("User") || "{}");

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/get-complaint");
      setComplaints(res.data.complaints || []);
    } catch (e) {
      if (e?.status === 401) navigate("/", { replace: true });
      else setError(e.message || "Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = complaints
    .filter((c) => statusFilter === "All" || c.status === statusFilter)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.complaintNo?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.modelName?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey.includes("Date") || sortKey === "createdAt") { av = new Date(av || 0); bv = new Date(bv || 0); }
      else { av = (av || "").toString().toLowerCase(); bv = (bv || "").toString().toLowerCase(); }
      return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const stats = {
    total:    complaints.length,
    open:     complaints.filter((c) => c.status === "Open").length,
    pending:  complaints.filter((c) => c.status === "Pending").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
    closure:  complaints.length > 0
      ? Math.round((complaints.filter((c) => c.status === "Resolved").length / complaints.length) * 100)
      : 0,
  };

  const hasFilters = search.trim() || statusFilter !== "All";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (e) { console.error(e); }
  };

  const SortArrow = ({ k }) => {
    const active = sortKey === k;
    const up = sortDir === "asc";
    return (
      <span style={{ marginLeft: 3, opacity: active ? 1 : 0.3, display: "inline-flex", flexDirection: "column", gap: 1 }}>
        <svg width="8" height="8" viewBox="0 0 10 10" fill={active && up ? "#007AFF" : "#8E8E93"}>
          <path d="M5 2l4 6H1z"/>
        </svg>
        <svg width="8" height="8" viewBox="0 0 10 10" fill={active && !up ? "#007AFF" : "#8E8E93"}>
          <path d="M5 8L1 2h8z"/>
        </svg>
      </span>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        body { background: #F2F2F7; }

        .cms-root {
          min-height: 100dvh;
          background: linear-gradient(160deg, #F2F2F7 0%, #E5E5EA 100%);
        }

        .cms-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(30px) saturate(200%);
          -webkit-backdrop-filter: blur(30px) saturate(200%);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          height: 58px;
          display: flex; align-items: center;
          padding: 0 20px;
        }

        .tbl-row { transition: background 0.12s; }
        .tbl-row:hover { background: rgba(0,122,255,0.04) !important; }

        .tbl-th { cursor: pointer; user-select: none; }
        .tbl-th:hover .th-label { color: #007AFF !important; }

        .slim-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
        .slim-scroll::-webkit-scrollbar-track { background: transparent; }
        .slim-scroll::-webkit-scrollbar-thumb { background: #C7C7CC; border-radius: 99px; }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s cubic-bezier(0.4,0,0.2,1) both; }

        .stats-row {
          display: flex; gap: 10px; overflow-x: auto;
          padding: 14px 20px; scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .stats-row::-webkit-scrollbar { display: none; }
        .stats-row > * { scroll-snap-align: start; }

        @media (min-width: 768px) { .stats-row { flex-wrap: nowrap; overflow-x: visible; } }

        .cms-main { padding: 0 20px 32px; }
        @media (max-width: 640px) {
          .cms-main { padding: 0 12px 80px; }
          .cms-nav { padding: 0 14px; }
        }

        .filter-bar {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 18px; padding: 12px 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          margin: 14px 0 10px;
        }

        .nav-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 10px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          border: none; transition: all 0.15s cubic-bezier(0.4,0,0.2,1);
        }
        .nav-btn:active { transform: scale(0.96); }

        .tbl-wrapper {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.72);
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        .fab {
          position: fixed; bottom: 24px; right: 20px;
          width: 52px; height: 52px; border-radius: 16px;
          background: #007AFF;
          box-shadow: 0 8px 24px rgba(0,122,255,0.4);
          display: none; align-items: center; justify-content: center;
          border: none; cursor: pointer; z-index: 40;
          transition: all 0.15s;
        }
        .fab:active { transform: scale(0.94); }
        @media (max-width: 767px) { .fab { display: flex; } }
        @media (min-width: 768px) { .fab { display: none; } }

        /* ── Edit action button ── */
        .action-edit-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 8px;
          font-size: 10px; font-weight: 700; cursor: pointer;
          background: rgba(0,122,255,0.08);
          border: 1px solid rgba(0,122,255,0.2);
          color: #007AFF; transition: all 0.14s;
          white-space: nowrap; font-family: inherit;
        }
        .action-edit-btn:hover { background: rgba(0,122,255,0.15); border-color: rgba(0,122,255,0.35); }
        .action-edit-btn:active { transform: scale(0.95); }

        /* ── Video play button ── */
        .video-play-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 9px; border-radius: 8px;
          font-size: 10px; font-weight: 700; cursor: pointer;
          background: rgba(255,159,10,0.10);
          border: 1px solid rgba(255,159,10,0.25);
          color: #FF9F0A; transition: all 0.14s;
          white-space: nowrap; font-family: inherit;
        }
        .video-play-btn:hover { background: rgba(255,159,10,0.18); }
        .video-play-btn:active { transform: scale(0.95); }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
          .show-sm { display: inline !important; }
          .hide-sm { display: none !important; }
        }
        @media (min-width: 641px) {
          .hide-mobile { display: flex !important; }
          .show-sm { display: none !important; }
          .hide-sm { display: inline !important; }
        }
      `}</style>

      <div className="cms-root">

        {/* ══════════ NAVBAR ══════════ */}
        <header className="cms-nav">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden" }}>
              <img src="./pg-logo-Photoroom.png" alt="PG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ lineHeight: 1 }} className="hide-sm border-l-2 border-red-600 pl-4">
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1C1C1E", letterSpacing: "-0.3px" }}>
                CMS <span style={{ color: "#FF3B30" }}>Dashboard</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8E8E93", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                Complaint Monitor System
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#C7C7CC", display: "inline-block" }} />
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {(user?.email || userEmail) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px 5px 8px", borderRadius: 10,
              background: "#F2F2F7", border: "1px solid #E5E5EA",
              marginRight: 8,
            }} className="hide-mobile">
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: "linear-gradient(135deg, #007AFF, #5AC8FA)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#3A3A3C", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email || userEmail}
              </span>
            </div>
          )}

          <Tooltip title="Refresh" placement="bottom">
            <button onClick={fetchComplaints} disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: 10, border: "1px solid #E5E5EA",
                background: "#F2F2F7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                marginRight: 6, opacity: loading ? 0.5 : 1,
              }}>
              <svg width="14" height="14" fill="none" stroke="#3A3A3C" strokeWidth="2" viewBox="0 0 24 24"
                style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
                <path d="M3 12a9 9 0 109-9" strokeLinecap="round"/>
                <polyline points="3 3 3 9 9 9" strokeLinecap="round"/>
              </svg>
            </button>
          </Tooltip>

          <button onClick={() => navigate("/complaints/form")} className="nav-btn hide-mobile" style={{
            background: "#007AFF", color: "#fff",
            boxShadow: "0 4px 14px rgba(0,122,255,0.35)",
            marginRight: 6,
          }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            <span>New Complaint</span>
          </button>

          <button onClick={handleLogout} className="nav-btn" style={{
            background: "#FFF2F0", color: "#FF3B30",
            border: "1px solid rgba(255,59,48,0.2)",
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeLinecap="round"/>
            </svg>
            <span className="">Logout</span>
          </button>
        </header>

        {/* ══════════ STAT CARDS ══════════ */}
        <div className="stats-row fade-up" style={{ animationDelay: "0.05s" }}>
          <StatCard label="Total" value={stats.total} color="#1C1C1E" />
          <StatCard label="Open" value={stats.open} color="#007AFF"
            sub={`${stats.total ? Math.round((stats.open/stats.total)*100) : 0}% of total`} />
          <StatCard label="Pending" value={stats.pending} color="#FF9F0A"
            sub={`${stats.total ? Math.round((stats.pending/stats.total)*100) : 0}% of total`} />
          <StatCard label="Resolved" value={stats.resolved} color="#34C759"
            sub={`${stats.total ? Math.round((stats.resolved/stats.total)*100) : 0}% of total`} />
          <StatCard
            label="Closure Rate"
            value={`${stats.closure}%`}
            color={stats.closure >= 70 ? "#34C759" : stats.closure >= 40 ? "#FF9F0A" : "#FF3B30"}
            sub="resolved / total"
          />
        </div>

        {/* ══════════ BODY ══════════ */}
        <main className="cms-main">

          {/* ── FILTER BAR ── */}
          <div className="filter-bar fade-up" style={{ animationDelay: "0.1s" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <svg width="14" height="14" fill="none" stroke="#C7C7CC" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search complaint no., customer or model…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 32, paddingRight: search ? 32 : 12,
                  paddingTop: 8, paddingBottom: 8,
                  borderRadius: 10, border: "1.5px solid",
                  borderColor: search ? "#007AFF" : "#E5E5EA",
                  background: search ? "rgba(0,122,255,0.04)" : "#F2F2F7",
                  fontSize: 12, fontWeight: 500, color: "#1C1C1E",
                  outline: "none", transition: "all 0.15s",
                }}
              />
              {search && (
                <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    width: 18, height: 18, borderRadius: "50%", background: "#C7C7CC",
                    border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", overflowX: "auto" }}>
              {STATUSES.map((s) => {
                const active = statusFilter === s;
                const cnt = s !== "All" ? complaints.filter((c) => c.status === s).length : null;
                const cfg = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{
                      padding: "6px 12px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                      border: active ? "1.5px solid" : "1.5px solid #E5E5EA",
                      borderColor: active ? (cfg ? cfg.dot : "#1C1C1E") : "#E5E5EA",
                      background: active ? (cfg ? cfg.bg : "rgba(0,0,0,0.06)") : "#F2F2F7",
                      color: active ? (cfg ? cfg.text : "#1C1C1E") : "#8E8E93",
                    }}>
                    {s}
                    {cnt != null && (
                      <span style={{
                        marginLeft: 5, fontSize: 9, fontWeight: 800,
                        background: active ? (cfg ? cfg.dot : "#1C1C1E") : "#E5E5EA",
                        color: active ? "#fff" : "#636366",
                        padding: "1px 6px", borderRadius: 99,
                      }}>{cnt}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {hasFilters && (
              <button onClick={() => { setSearch(""); setStatusFilter("All"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 9, fontSize: 11, fontWeight: 700,
                  background: "#FFF2F0", color: "#FF3B30", border: "1px solid rgba(255,59,48,0.2)",
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
                Clear
              </button>
            )}
          </div>

          {hasFilters && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingLeft: 4 }}>
              <span style={{ fontSize: 11, color: "#8E8E93" }}>Showing</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1C1C1E" }}>{filtered.length}</span>
              <span style={{ fontSize: 11, color: "#8E8E93" }}>of {complaints.length} complaints</span>
              {statusFilter !== "All" && <StatusBadge status={statusFilter} />}
            </div>
          )}

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 14, marginBottom: 12,
              background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)",
              color: "#FF3B30", fontSize: 13, fontWeight: 600,
            }}>
              <span>⚠️</span> {error}
              <button onClick={fetchComplaints}
                style={{ marginLeft: "auto", fontSize: 11, color: "#007AFF", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                Retry
              </button>
            </div>
          )}

          {/* ── TABLE ── */}
          <div className="tbl-wrapper fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="slim-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fff", borderBottom: "2px solid rgba(0,0,0,0.06)" }}>
                    <th style={{ padding: "11px 14px", textAlign: "left" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#636366" }}>S.N.</span>
                    </th>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={col.image || col.video ? "" : "tbl-th"}
                        onClick={() => !col.image && !col.video && toggleSort(col.key)}
                        style={{ padding: "11px 14px", textAlign: "left", whiteSpace: "nowrap" }}
                      >
                        <span className="th-label" style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
                          color: sortKey === col.key ? "#007AFF" : "#636366",
                          display: "inline-flex", alignItems: "center", gap: 2,
                          transition: "color 0.12s",
                        }}>
                          {col.label}
                          {!col.image && !col.video && <SortArrow k={col.key} />}
                        </span>
                      </th>
                    ))}
                    {/* Actions TH */}
                    <th style={{ padding: "11px 14px", textAlign: "left", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#636366" }}>
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => <Skeleton key={i} />)
                    : paginated.length === 0
                    ? <EmptyState hasFilters={!!hasFilters} />
                    : paginated.map((c, idx) => (
                        <tr key={c._id} className="tbl-row"
                          style={{
                            cursor: "pointer",
                            background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.012)",
                            borderBottom: "1px solid rgba(0,0,0,0.04)",
                          }}>

                          {/* S.N. → opens detail drawer */}
                          <td style={{ padding: "9px 14px" }} onClick={() => setSelected(c)}>
                            <span style={{ fontSize: 10, color: "#C7C7CC", fontFamily: "ui-monospace, monospace" }}>
                              {(page - 1) * PAGE_SIZE + idx + 1}
                            </span>
                          </td>

                          {COLUMNS.map((col) => {
                            const val = c[col.key];

                            /* IMAGE column — Ant Design Image with lightbox */
                            if (col.image) {
                              return (
                                <td key={col.key} style={{ padding: "9px 14px" }}
                                  onClick={(e) => e.stopPropagation()}>
                                  {val ? (
                                    <Image
                                      src={val}
                                      width={34}
                                      height={34}
                                      style={{ borderRadius: 8, objectFit: "cover", border: "1px solid #E5E5EA", display: "block" }}
                                      preview={{
                                        mask: (
                                          <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 2 }}>
                                            <svg width="9" height="9" fill="white" viewBox="0 0 24 24">
                                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                              <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                            View
                                          </span>
                                        ),
                                      }}
                                      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34'%3E%3Crect width='34' height='34' rx='8' fill='%23F2F2F7'/%3E%3Ctext x='17' y='23' text-anchor='middle' font-size='14' fill='%23C7C7CC'%3E📷%3C/text%3E%3C/svg%3E"
                                    />
                                  ) : (
                                    <span style={{ fontSize: 10, color: "#C7C7CC" }}>—</span>
                                  )}
                                </td>
                              );
                            }

                            /* VIDEO column */
                            if (col.video) {
                              return (
                                <td key={col.key} style={{ padding: "9px 14px" }}
                                  onClick={(e) => e.stopPropagation()}>
                                  {val ? (
                                    <button className="video-play-btn" onClick={() => setVideoPreview(val)}>
                                      <svg width="9" height="9" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                      Play
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 10, color: "#C7C7CC" }}>—</span>
                                  )}
                                </td>
                              );
                            }

                            /* Regular columns → click opens detail drawer */
                            return (
                              <td key={col.key} style={{ padding: "9px 14px", maxWidth: 160 }}
                                onClick={() => setSelected(c)}>
                                {col.status ? (
                                  <StatusBadge status={val} />
                                ) : col.aging ? (
                                  <Tooltip title={val != null ? `${val} days old` : ""} placement="top">
                                    <span style={{
                                      fontSize: 10, fontFamily: "ui-monospace, monospace",
                                      color: val > 365 ? "#FF3B30" : val > 180 ? "#FF9F0A" : "#34C759",
                                      fontWeight: 700,
                                    }}>
                                      {val != null ? `${val}d` : ""}
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title={val || ""} placement="top" mouseEnterDelay={0.5}>
                                    <span style={{
                                      fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                      color: col.mono ? "#007AFF" : col.date ? "#8E8E93" : "#1C1C1E",
                                      fontWeight: col.mono ? 700 : col.date ? 500 : 500,
                                      fontFamily: col.mono || col.date ? "ui-monospace, monospace" : "inherit",
                                      letterSpacing: col.mono ? "-0.2px" : 0,
                                    }}>
                                      {col.date
                                        ? (col.key === "createdAt" ? fmtDateTime(val) : fmtDate(val))
                                        : val || ""}
                                    </span>
                                  </Tooltip>
                                )}
                              </td>
                            );
                          })}

                          {/* ── ACTIONS COLUMN — redirects to form with complaint _id in URL ── */}
                          { c.status === "Open" && (
                            <td style={{ padding: "9px 14px" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-edit-btn"
                                onClick={() => navigate(`/complaints/form/update/${c._id}`, { state: { isEdit: true } })}
                              >
                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round"/>
                              </svg>
                              Edit
                            </button>
                          </td>)
                          }

                        </tr>
                      ))
                    }
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION ── */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div style={{
                padding: "12px 16px", borderTop: "1px solid rgba(0,0,0,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
                background: "rgba(255,255,255,0.5)",
              }}>
                <p style={{ fontSize: 11, color: "#8E8E93", margin: 0, fontFamily: "ui-monospace, monospace" }}>
                  <span style={{ fontWeight: 700, color: "#1C1C1E" }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span>
                  {" "}of{" "}
                  <span style={{ fontWeight: 700, color: "#1C1C1E" }}>{filtered.length}</span>
                </p>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {[
                    { label: "«", action: () => setPage(1), disabled: page === 1 },
                    { label: "‹", action: () => setPage((p) => Math.max(1, p - 1)), disabled: page === 1 },
                  ].map(({ label, action, disabled }) => (
                    <button key={label} onClick={action} disabled={disabled}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: "1px solid #E5E5EA",
                        background: "#F2F2F7", cursor: disabled ? "not-allowed" : "pointer",
                        fontSize: 12, fontWeight: 700, color: "#3A3A3C", opacity: disabled ? 0.3 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{label}</button>
                  ))}

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
                    .map((n, i) => n === "…"
                      ? <span key={`e${i}`} style={{ width: 30, textAlign: "center", color: "#C7C7CC", fontSize: 11 }}>…</span>
                      : <button key={n} onClick={() => setPage(n)}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: page === n ? "none" : "1px solid #E5E5EA",
                            background: page === n ? "#007AFF" : "#F2F2F7",
                            color: page === n ? "#fff" : "#3A3A3C",
                            fontWeight: 700, fontSize: 11, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: page === n ? "0 4px 12px rgba(0,122,255,0.3)" : "none",
                          }}>{n}</button>
                    )
                  }

                  {[
                    { label: "›", action: () => setPage((p) => Math.min(totalPages, p + 1)), disabled: page === totalPages },
                    { label: "»", action: () => setPage(totalPages), disabled: page === totalPages },
                  ].map(({ label, action, disabled }) => (
                    <button key={label} onClick={action} disabled={disabled}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: "1px solid #E5E5EA",
                        background: "#F2F2F7", cursor: disabled ? "not-allowed" : "pointer",
                        fontSize: 12, fontWeight: 700, color: "#3A3A3C", opacity: disabled ? 0.3 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{label}</button>
                  ))}
                </div>
              </div>
            )}

            {!loading && filtered.length > 0 && filtered.length <= PAGE_SIZE && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                <p style={{ fontSize: 11, color: "#AEAEB2", margin: 0, fontFamily: "ui-monospace, monospace" }}>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""} shown
                </p>
              </div>
            )}
          </div>
        </main>

        {/* FAB — mobile new complaint */}
        <button onClick={() => navigate("/complaints/form")} className="fab">
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Detail Drawer */}
      {selected && <DetailDrawer complaint={selected} onClose={() => setSelected(null)} />}

      {/* Video Preview Modal */}
      {videoPreview && <VideoModal videoKey={videoPreview} onClose={() => setVideoPreview(null)} />}
    </>
  );
}