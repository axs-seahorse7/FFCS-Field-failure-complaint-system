// components/DrilldownModal.jsx
// iOS-styled content inside Ant Design Modal (centered, pop-up)
// Supports 3 types: "complaints" | "comparison" | "detail"
// Props: open, onClose, title, subtitle, data, type
import { useEffect, useRef } from "react";
import { Modal, Image } from "antd";
import StatusBadge from "../components/StatusBadge.jsx";
import { fmtNum, fmtDate } from "../components/utils.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";

/* ─── palette ─────────────────────────────────────────────────────────── */
const IOS_COLORS = [
  "#007AFF","#34C759","#FF9500","#AF52DE",
  "#FF3B30","#32ADE6","#FF2D55","#5AC8FA",
];

const STATUS_STYLES = {
  Resolved:    { bg: "rgba(52,199,89,0.13)",   text: "#1a7a36" },
  Pending:     { bg: "rgba(255,149,0,0.15)",    text: "#a35e00" },
  "In Progress":{ bg: "rgba(0,122,255,0.12)",   text: "#0050c0" },
  Rejected:    { bg: "rgba(255,59,48,0.13)",    text: "#c0281f" },
  Closed:      { bg: "rgba(142,142,147,0.15)",  text: "#48484a" },
};

/* ─── tiny sub-components ──────────────────────────────────────────────── */
function IOSBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  return (
    <span style={{
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 600,
      borderRadius: 6, padding: "2px 8px",
      display: "inline-block", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, badge, badgeStyle, delay = 0 }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      padding: "14px 12px",
      border: "0.5px solid rgba(60,60,67,0.12)",
      display: "flex", flexDirection: "column", gap: 4,
      animation: `iosPopIn 0.28s cubic-bezier(0.32,0.72,0,1) ${delay}s both`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
      {badge && (
        <span style={{
          fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 7px",
          background: badgeStyle?.bg || "rgba(0,122,255,0.12)",
          color: badgeStyle?.text || "#0050c0",
          display: "inline-block", width: "fit-content",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "#8E8E93",
      letterSpacing: "0.06em", textTransform: "uppercase",
      margin: "0 0 10px",
    }}>
      {children}
    </div>
  );
}

/* ─── complaints list — dual column grid ───────────────────────────────── */
function ComplaintCard({ row, i }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      border: "0.5px solid rgba(60,60,67,0.12)",
      padding: "14px 14px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      animation: `iosPopIn 0.26s cubic-bezier(0.32,0.72,0,1) ${0.06 + i * 0.05}s both`,
    }}>
      {/* top row: number chip + customer + badge */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: IOS_COLORS[i % IOS_COLORS.length] + "22",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: IOS_COLORS[i % IOS_COLORS.length],
        }}>
          {String(i + 1).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {row.customerName || "—"}
          </div>
          {row.complaintDate && (
            <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 1 }}>{fmtDate(row.complaintDate)}</div>
          )}
        </div>
        <IOSBadge status={row.status} />
      </div>

      {/* divider */}
      <div style={{ height: "0.5px", background: "rgba(60,60,67,0.1)" }} />

      {/* meta grid: 2 cols of key→value pairs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px" }}>
        {[
          ["No", row.complaintNo],
          ["Model", row.modelName],
          ["Part", row.defectivePart],
          ["DOA", row.doa || "No"],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#1C1C1E", marginTop: 1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val || "—"}</div>
          </div>
        ))}
      </div>

      {/* defect — full width */}
      {row.defectDetails && (
        <div style={{
          fontSize: 12, color: "#48484A", lineHeight: 1.5,
          background: "rgba(60,60,67,0.04)", borderRadius: 8, padding: "6px 10px",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {row.defectDetails}
        </div>
      )}
    </div>
  );
}

function ComplaintsContent({ data }) {
  const totals = {
    total: data.length,
    pending: data.filter(d => d.status === "Pending" || d.status === "In Progress").length,
    resolved: data.filter(d => d.status === "Resolved").length,
  };

  return (
    <>
      {/* stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total" value={totals.total} badge="All" badgeStyle={{ bg:"rgba(0,122,255,0.12)", text:"#0050c0" }} delay={0.06} />
        <StatCard label="Open" value={totals.pending} badge="Pending" badgeStyle={{ bg:"rgba(255,149,0,0.15)", text:"#a35e00" }} delay={0.12} />
        <StatCard label="Done" value={totals.resolved} badge="Resolved" badgeStyle={{ bg:"rgba(52,199,89,0.13)", text:"#1a7a36" }} delay={0.18} />
      </div>

      <SectionLabel>Complaints</SectionLabel>

      {/* dual-column card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {data.map((row, i) => (
          <ComplaintCard key={row._id || row.complaintNo || i} row={row} i={i} />
        ))}
      </div>
    </>
  );
}

/* ─── comparison bars ──────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "0.5px solid rgba(60,60,67,0.15)",
      borderRadius: 12, padding: "8px 14px", fontFamily: "-apple-system, sans-serif",
      boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E" }}>{fmtNum(payload[0].value)}</div>
      <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>{payload[0].payload?.name}</div>
    </div>
  );
};

function ComparisonContent({ data }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value || 1;

  // Split into left and right columns
  const left  = sorted.filter((_, i) => i % 2 === 0);
  const right = sorted.filter((_, i) => i % 2 === 1);

  const BarRow = ({ d, i }) => (
    <div style={{ marginBottom: 14, animation: `iosPopIn 0.26s cubic-bezier(0.32,0.72,0,1) ${0.06 + i * 0.06}s both` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#1C1C1E", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"70%" }}>{d.name}</div>
        <div style={{ fontSize:13, fontWeight:700, color:"#1C1C1E", fontVariantNumeric:"tabular-nums", letterSpacing:"-0.02em", flexShrink:0 }}>{fmtNum(d.value)}</div>
      </div>
      <div style={{ height:7, background:"rgba(60,60,67,0.1)", borderRadius:4, overflow:"hidden" }}>
        <div style={{
          height:"100%", borderRadius:4,
          background: IOS_COLORS[i % IOS_COLORS.length],
          width:`${Math.round((d.value / max) * 100)}%`,
          transition:"width 0.9s cubic-bezier(0.32,0.72,0,1)",
        }} />
      </div>
      {d.pct !== undefined && (
        <div style={{ fontSize:11, color:"#8E8E93", marginTop:3 }}>{d.pct}% of total</div>
      )}
    </div>
  );

  return (
    <>
      {/* top stat cards — 4 across */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
        {sorted.slice(0, 4).map((d, i) => (
          <div key={d.name} style={{
            background:"#fff", borderRadius:12, padding:"12px 10px",
            border:"0.5px solid rgba(60,60,67,0.12)",
            animation:`iosPopIn 0.28s cubic-bezier(0.32,0.72,0,1) ${0.04 + i * 0.07}s both`,
          }}>
            <div style={{ width:8, height:8, borderRadius:2, background:IOS_COLORS[i], marginBottom:5 }} />
            <div style={{ fontSize:9, fontWeight:600, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.05em", lineHeight:1.3 }}>{d.name}</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#1C1C1E", letterSpacing:"-0.03em", marginTop:3, lineHeight:1 }}>{fmtNum(d.value)}</div>
            {d.pct !== undefined && <div style={{ fontSize:11, color:"#8E8E93", marginTop:2 }}>{d.pct}%</div>}
          </div>
        ))}
      </div>

      <SectionLabel>Distribution</SectionLabel>

      {/* dual-column bar layout */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        <div>{left.map((d, i)  => <BarRow key={d.name} d={d} i={i * 2} />)}</div>
        <div>{right.map((d, i) => <BarRow key={d.name} d={d} i={i * 2 + 1} />)}</div>
      </div>

      {/* full recharts only if many items */}
      {sorted.length > 8 && (
        <>
          <SectionLabel style={{ marginTop:16 }}>Full Chart</SectionLabel>
          <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 32)}>
            <BarChart data={sorted} layout="vertical" margin={{ left:8, right:48, top:4, bottom:4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:"#8E8E93", fontFamily:"-apple-system,sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize:11, fill:"#8E8E93", fontFamily:"-apple-system,sans-serif" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill:"rgba(60,60,67,0.05)" }} />
              <Bar dataKey="value" radius={[0,6,6,0]}>
                {sorted.map((_, i) => <Cell key={i} fill={IOS_COLORS[i % IOS_COLORS.length]} />)}
                <LabelList dataKey="value" position="right" formatter={fmtNum}
                  style={{ fill:"#8E8E93", fontSize:11, fontFamily:"-apple-system,sans-serif", fontWeight:600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </>
  );
}

/* ─── detail view — dual column ────────────────────────────────────────── */
function DetailContent({ data }) {
  const entries = Object.entries(data).filter(([k, v]) => {
    if (v === null || v === undefined || v === "") return false;
    if (k === "_id" || k.toLowerCase() === "id") return false;
    if (k === "imageKey") return false;      
    if(k === "videoUrl") return false;     // ← remove videoKey
    if(k === "videoKey") return false;     // ← remove videoKey
    return true;
  });

  const toLabel = key => key.replace(/([A-Z])/g, " $1").trim();

  const renderValue = (key, value) => {
    if (key === "imageUrl") return (                // ← render as Image
      <Image
        src={value}
        alt="Complaint Image"
        style={{ borderRadius: 10, maxHeight: 50, objectFit: "cover" }}
        placeholder
      />
    );
    if (key === "createdBy" && value?.email) return value.email;
    if (key === "status") return <IOSBadge status={value} />;
    if (key.includes("Date") || key.includes("At")) return fmtDate(value);
    return String(value) || "—";
  };

  // rest stays exactly the same...

  const name  = data.customerName || data.name  || null;
  const model = data.modelName    || data.model || null;

  // Split entries into two columns (odd index → left, even → right)
  const left  = entries.filter((_, i) => i % 2 === 0);
  const right = entries.filter((_, i) => i % 2 === 1);

  const FieldCell = ({ label, value, delay }) => (
    <div style={{
      padding: "11px 14px",
      animation: `iosSlideRow 0.22s cubic-bezier(0.32,0.72,0,1) ${delay}s both`,
    }}>
      <div style={{ fontSize:11, fontWeight:600, color:"#8E8E93", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>
        {label}
      </div>
      <div style={{ fontSize:14, fontWeight:500, color:"#1C1C1E", lineHeight:1.45, letterSpacing:"-0.01em", wordBreak:"break-word" }}>
        {value}
      </div>
    </div>
  );

  const Column = ({ items, startDelay }) => (
    <div style={{ background:"#fff", borderRadius:14, border:"0.5px solid rgba(60,60,67,0.12)", overflow:"hidden" }}>
      {items.map(([key, value], i) => (
        <div key={key} style={{ borderBottom: i < items.length - 1 ? "0.5px solid rgba(60,60,67,0.1)" : "none" }}>
          <FieldCell
            label={toLabel(key)}
            value={renderValue(key, value)}
            delay={startDelay + i * 0.04}
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* hero identity card */}
      {name && (
        <div style={{
          display:"flex", alignItems:"center", gap:14, marginBottom:20,
          padding:"14px 16px", background:"#fff", borderRadius:14,
          border:"0.5px solid rgba(60,60,67,0.12)",
          animation:"iosPopIn 0.28s cubic-bezier(0.32,0.72,0,1) 0.04s both",
        }}>
          <div style={{
            width:46, height:46, borderRadius:14, flexShrink:0,
            background:"rgba(0,122,255,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:700, color:"#007AFF",
          }}>
            {name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"#1C1C1E", letterSpacing:"-0.02em" }}>{name}</div>
            {model && <div style={{ fontSize:13, color:"#8E8E93", marginTop:2 }}>{model}</div>}
          </div>
          {data.status && <IOSBadge status={data.status} />}
        </div>
      )}

      <SectionLabel>Details</SectionLabel>

      {/* dual column grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Column items={left}  startDelay={0.08} />
        <Column items={right} startDelay={0.10} />
      </div>
    </>
  );
}

/* ─── main component ───────────────────────────────────────────────────── */
const KEYFRAMES = `
@keyframes iosOverlayIn  { from { opacity:0 } to { opacity:1 } }
@keyframes iosDialogIn   { from { transform:scale(0.92) translateY(10px); opacity:0 } to { transform:scale(1) translateY(0); opacity:1 } }
@keyframes iosPopIn      { from { transform:scale(0.94); opacity:0 } to { transform:scale(1); opacity:1 } }
@keyframes iosSlideRow   { from { transform:translateY(8px); opacity:0 } to { transform:translateY(0); opacity:1 } }
`;

export default function DrilldownModal({ open, onClose, title, subtitle, data, type }) {
  const sheetRef = useRef(null);

  // close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === "Escape" && open) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const renderContent = () => {
    if (!data) return null;
    if (type === "complaints") return <ComplaintsContent data={data} />;
    if (type === "comparison") return <ComparisonContent data={data} />;
    if (type === "detail")     return <DetailContent data={data} />;
    return null;
  };

  return (
    <>
      {/* inject keyframes once */}
      <style>{KEYFRAMES}</style>

      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.42)",
          backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
          animation:"iosOverlayIn 0.22s ease forwards",
          width:"100vw", height:"100vh",
          position:"relative"
        }}
      />

      {/* centered dialog */}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={860}
        styles={{
          body: {
            padding: "16px 20px 32px",
            maxHeight: "70vh",
            overflowY: "auto",
          },
          header: {
            padding: "14px 20px 12px",
            borderBottom: "0.5px solid rgba(60,60,67,0.1)",
          },
        }}
        style={{
          borderRadius: 20,
          overflow: "hidden",
        }}
        className="ios-modal"
        title={
          <div>
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#1C1C1E",
              letterSpacing: "-0.02em"
            }}>
              {title}
            </div>
            
            {subtitle && (
              <div style={{
                fontSize: 12,
                color: "#8E8E93",
                marginTop: 3
              }}>
                {subtitle}
              </div>
            )}
          </div>
        }
      >
        {renderContent()}
      </Modal>
    </>
  );
}