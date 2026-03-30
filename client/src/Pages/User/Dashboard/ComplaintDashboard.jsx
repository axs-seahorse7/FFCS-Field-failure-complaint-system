import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/axios-interceptore/api";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const STATUSES = ["All", "Open", "Active", "Pending", "Resolved", "Closed"];
const PAGE_SIZE = 10;

const STATUS_STYLES = {
  Open:     { pill: "bg-blue-50 text-blue-600 border-blue-200",     dot: "bg-blue-500" },
  Active:   { pill: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  Pending:  { pill: "bg-amber-50 text-amber-600 border-amber-200",  dot: "bg-amber-400" },
  Resolved: { pill: "bg-teal-50 text-teal-600 border-teal-200",     dot: "bg-teal-500" },
  Closed:   { pill: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

const COLUMNS = [
  { key: "complaintNo",   label: "Complaint No.",    mono: true },
  { key: "complaintDate", label: "Complaint Date", date: true },
  { key: "customerName",  label: "Customer"                      },
  { key: "commodity",     label: "Commodity"                     },
  { key: "modelName",     label: "Model Name"                    },
  { key: "defectCategory",label: "Defect Category"               },
  { key: "defectivePart", label: "Defective Part"                },
  { key: "defectDetails", label: "Defect Details"                },
  { key: "doa",           label: "DOA"                           },
  { key: "status",        label: "Status",           status: true },
  { key: "createdAt",     label: "Created At",        date: true  },
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function fmtDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border whitespace-nowrap ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {status || "—"}
    </span>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue:    "from-blue-500/10 to-blue-600/5 border-blue-200/60 text-blue-600",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-200/60 text-emerald-600",
    amber:   "from-amber-500/10 to-amber-600/5 border-amber-200/60 text-amber-600",
    slate:   "from-slate-200/60 to-slate-100/40 border-slate-200/60 text-slate-500",
    red:     "from-red-500/10 to-red-600/5 border-red-200/60 text-red-600",
  };
  return (
    <div className={`bg-linear-to-br ${colors[color]} border rounded-2xl p-4 flex items-center gap-3`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-[14px] font-bold uppercase tracking-widest text-slate-400 font-['DM_Mono',monospace] leading-none mb-1">{label}</p>
        <p className={`text-2xl font-extrabold tracking-tight leading-none ${colors[color].split(" ").slice(-1)[0]}`}>{value}</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <tr className="animate-pulse">
      {COLUMNS.map((c) => (
        <td key={c.key} className="px-4 py-3.5">
          <div className="h-3 bg-slate-200 rounded-full" style={{ width: "40%" }} />
        </td>
      ))}
      <td className="px-4 py-3.5"><div className="h-3 w-12 bg-slate-200 rounded-full" /></td>
    </tr>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <tr>
      <td colSpan={COLUMNS.length + 1} className="py-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">
            {hasFilters ? "🔍" : "📋"}
          </div>
          <div>
            <p className="font-bold text-slate-700 text-sm">
              {hasFilters ? "No results found" : "No complaints yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {hasFilters ? "Try adjusting your filters or search term" : "Submit your first complaint to see it here"}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────
   DETAIL DRAWER
───────────────────────────────────────── */
function DetailDrawer({ complaint, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!complaint) return null;

  const rows = [
    ["Complaint No.",    complaint.complaintNo,    true],
    ["Complaint Date",   fmtDate(complaint.complaintDate)],
    ["Created At",       fmtDateTime(complaint.createdAt)],
    ["Customer Name",    complaint.customerName],
    ["Commodity",        complaint.commodity],
    ["Replacement Cat.", complaint.replacementCategory || "—"],
    ["Model Name",       complaint.modelName],
    ["Purchase Date",    fmtDate(complaint.purchaseDate)],
    ["DOA",              complaint.doa || "—"],
    ["Defect Category",  complaint.defectCategory],
    ["Defective Part",   complaint.defectivePart],
    ["Symptom",          complaint.symptom || "—"],
    ["Defect Details",   complaint.defectDetails],
    ["Status",           complaint.status, false, true],
    ["Created By",       complaint.createdBy.email || "—"],
  ];

   const handleDownloadDocument = () => {
    // Implement document generation and downloading logic here
    alert("Download functionality is coming soon.");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer header */}
        <div className="bg-[#556194] px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-['DM_Mono',monospace]">Complaint Detail</p>
            <p className="text-base font-extrabold text-white mt-0.5 font-['DM_Mono',monospace]">
              {complaint.complaintNo}
            </p>
          </div>
          <div className="flex items-center gap-2">
           
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {rows.map(([label, value, mono, isStatus]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-200 last:border-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-['DM_Mono',monospace] shrink-0 w-32">{label}</p>
              {isStatus ? (
                <StatusBadge status={value} />
              ) : (
                <p className={`text-sm text-slate-700 text-right font-semibold ${mono ? "font-['DM_Mono',monospace] text-blue-600" : ""}`}>
                  {value || "—"}
                </p>
              )}
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
export default function ComplaintDashboard({  userEmail, }) {
  const [complaints, setComplaints]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage]               = useState(1);
  const [selected, setSelected]       = useState(null);
  const [sortKey, setSortKey]         = useState("createdAt");
  const [sortDir, setSortDir]         = useState("desc");
  const searchRef = useRef();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("User") || "{}");

  /* ── Fetch ── */
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/get-complaint");
      setComplaints(res.data.complaints || []);
    } catch (e) {
      if(error.status === 401) {
        navigate("/", { replace: true });
      } else {
      setError(e.message || "Failed to load complaints.");
      }
    } finally {
      setLoading(false);
    }
  }, [error, navigate]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  /* ── Sort ── */
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* ── Filter + Search + Sort ── */
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
      if (sortKey.includes("Date") || sortKey === "createdAt") {
        av = new Date(av || 0); bv = new Date(bv || 0);
      } else {
        av = (av || "").toString().toLowerCase();
        bv = (bv || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* Reset page on filter change */
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  /* ── Stats ── */
  const stats = {
    total:    complaints.length,
    open:     complaints.filter((c) => c.status === "Open").length,
    active:   complaints.filter((c) => c.status === "Active").length,
    pending:  complaints.filter((c) => c.status === "Pending").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" strokeLinecap="round"/></svg>;
    return sortDir === "asc"
      ? <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeLinecap="round"/></svg>
      : <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round"/></svg>;
  };

  const hasFilters = search.trim() || statusFilter !== "All";

  const handleLogout = async () => {
  try {
    await api.post("/auth/logout");
    localStorage.removeItem("token");
    window.location.href = "/";

  } catch (error) {
    console.error("Error during logout:", error);
  }
};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-red-50/20">

        {/* ═══ NAVBAR ═══ */}
        <header className="sticky top-0 z-50 bg-[#c9c9c9] shadow-lg shadow-black/20 border-b border-white/5">
          <div className=" mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-md flex items-center justify-center shrink-0">
                <img src="./pg-logo-Photoroom.png" alt="PG Logo" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-white leading-tight ">FFS Dashboard</p>
              </div>
              <span className="sm:hidden text-sm font-bold text-white max-sm:hidden ">PG Dashboard</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {user?.email && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shrink-0">
                  <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-400 font-['DM_Mono',monospace]">{user?.email}</span>
                </div>
              )}
              <button
                onClick={fetchComplaints}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-600 max-sm:bg-transparent max-sm:border-none border border-white/12 text-white hover:text-zinc-600 hover:bg-white/20 cursor-pointer text-xs font-semibold transition-all disabled:opacity-40"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 12a9 9 0 109-9" strokeLinecap="round"/>
                  <polyline points="3 3 3 9 9 9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => navigate("/complaints/form")}
                className="flex items-center gap-1.5 px-3 py-1.5 max-sm:hidden rounded-lg bg-cyan-600/80 hover:bg-cyan-500 active:scale-95 text-white text-xs cursor-pointer tracking-wide transition-all shadow-lg shadow-cyan-900/30"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                </svg>
              <span className="hidden sm:inline ">New Complaint</span>
              </button>
              <button
              title="logout"
                onClick={() => handleLogout()}
                className=" cursor-pointer text-md flex items-center h-7 w-7 p-2 rounded-md bg-red-600 hover:bg-red-500 active:scale-95 text-white  transition-all shadow-lg shadow-red-900/30"
              >
                <i className="ri-logout-circle-r-line"></i> 
              </button>
            </div>
          </div>
        </header>

        <main className="  px-4 sm:px-6 py-7 pb-20">

          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              Complaint Register
            </h1>
            <p className="text-xs text-slate-400 font-['DM_Mono',monospace] mt-1">
              Field Failure System · {complaints.length} total record{complaints.length !== 1 ? "s" : ""}
            </p>
            
          </div>

          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total"    value={stats.total}    icon="" color="slate"   />
            <StatCard label="Open"     value={stats.open}     icon="" color="blue"    />
            <StatCard label="Active"   value={stats.active}   icon="" color="emerald" />
            <StatCard label="Pending"  value={stats.pending}  icon="" color="amber"   />
            <StatCard label="Resolved" value={stats.resolved} icon="" color="red"     />
          </div>

          {/* ── FILTER BAR ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200 px-4 py-3.5 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

                <button
                onClick={() => navigate("/complaints/form")}
                className=" self-end w-40 items-center gap-1.5 px-3 py-2 mt-3 hidden max-sm:flex  rounded-lg bg-cyan-600/80 hover:bg-cyan-500 active:scale-95 text-white text-xs cursor-pointer tracking-wide transition-all "
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                  <span className=" sm:inline ">New Complaint</span>
                </button>
                  
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search by complaint no., customer or model…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none
                    focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-400/10 placeholder:text-slate-300 transition-all
                    font-['Sora',sans-serif]"
                />
                
                {search && (
                  <button
                    onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>

              

              {/* Status filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1 whitespace-nowrap font-['DM_Mono',monospace]">
                  Status:
                </span>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${
                      statusFilter === s
                        ? "bg-[#12172B] text-white border-[#12172B] shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {s}
                    {s !== "All" && (
                      <span className={`ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                        statusFilter === s ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                      }`}>
                        {complaints.filter((c) => c.status === s).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("All"); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 text-xs font-semibold transition-all shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                  </svg>
                  Clear
                </button>
              )}
            </div>

            {/* Active filter summary */}
            {hasFilters && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] text-slate-400 font-['DM_Mono',monospace]">Showing</span>
                <span className="text-[10.5px] font-bold text-slate-700 font-['DM_Mono',monospace]">{filtered.length}</span>
                <span className="text-[10.5px] text-slate-400 font-['DM_Mono',monospace]">of {complaints.length} records</span>
                {search && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                    "{search}"
                  </span>
                )}
                {statusFilter !== "All" && <StatusBadge status={statusFilter} />}
              </div>
            )}
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold">
              <span>⚠️</span> {error}
              <button onClick={fetchComplaints} className="ml-auto text-xs underline underline-offset-2">Retry</button>
            </div>
          )}

          {/* ── TABLE CARD ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200 overflow-hidden">

            {/* Table scroll wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full ">
                <thead>
                  <tr className="bg-slate-50 border-b  border-slate-100">
                    <th className="px-4 py-3 text-left w-10">
                      <span className="text-[10px] font-bold tracking-widest text-slate-400 font-['DM_Mono',monospace]">S.N.</span>
                    </th>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left cursor-pointer  select-none group"
                        onClick={() => toggleSort(col.key)}
                      >
                        <div className="flex items-center  gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-700 transition-colors font-['DM_Mono',monospace] whitespace-nowrap">
                            {col.label}
                          </span>
                          <SortIcon k={col.key} />
                        </div>
                      </th>
                    ))}
                    {/* <th className="px-4 py-3 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-['DM_Mono',monospace]">Actions</span>
                    </th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[10px] bg-gray-200 ">
                  {loading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => <Skeleton key={i} />)
                    : paginated.length === 0
                    ? <EmptyState hasFilters={!!hasFilters} />
                    : paginated.map((c, idx) => (
                        <tr
                          key={c._id}
                          className="hover:bg-slate-50/80 transition-colors  cursor-pointer group"
                          onClick={() => setSelected(c)}
                        >
                          {/* Row number */}
                          <td className="px-4 py-3.5   ">
                            <span className="text-[11px] text-slate-400 font-['DM_Mono',monospace]">
                              {(page - 1) * PAGE_SIZE + idx + 1}
                            </span>
                          </td>

                          {COLUMNS.map((col) => {
                            let val = c[col.key];
                            return (
                              <td key={col.key} className="px-4 py-3  max-w-45">
                                {col.status ? (
                                  <StatusBadge status={val} />
                                ) : (
                                  <span className={`text-[10px] leading-snug  block truncate ${
                                    col.mono
                                      ? "font-['DM_Mono',monospace] text-blue-600 font-semibold text-xs"
                                      : col.date
                                      ? "text-slate-500 text-xs font-['DM_Mono',monospace]"
                                      : "text-slate-700 font-medium"
                                  }`}>
                                    {col.date
                                      ? (col.key === "createdAt" ? fmtDateTime(val) : fmtDate(val))
                                      : val || "—"}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Actions */}
                          {/* <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setSelected(c)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 flex items-center justify-center transition-all"
                                title="View details"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => onEditComplaint?.(c)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-600 text-slate-500 flex items-center justify-center transition-all"
                                title="Edit complaint"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            </div>
                          </td> */}
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION ── */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-400 font-['DM_Mono',monospace]">
                  Showing <span className="font-bold text-slate-600">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-slate-600">{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                    title="First page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round"/>
                    </svg>
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce((acc, n, i, arr) => {
                      if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === "…" ? (
                        <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs">…</span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                            page === n
                              ? "bg-[#12172B] text-white border-[#12172B] shadow-sm"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {n}
                        </button>
                      )
                    )
                  }

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                    title="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}

            {/* Table footer info */}
            {!loading && filtered.length > 0 && filtered.length <= PAGE_SIZE && (
              <div className="px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-['DM_Mono',monospace]">
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""} shown
                </p>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* ── DETAIL DRAWER ── */}
      {selected && <DetailDrawer complaint={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
