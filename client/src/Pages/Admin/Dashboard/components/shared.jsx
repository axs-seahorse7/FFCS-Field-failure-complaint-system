// components/shared.jsx — All shared presentational components

import { Spin } from "antd";

/* ── Color constants ── */
export const C = {
  red:     "#e53935",
  orange:  "#f97316",
  amber:   "#f59e0b",
  green:   "#22c55e",
  teal:    "#14b8a6",
  blue:    "#3b82f6",
  indigo:  "#6366f1",
  purple:  "#8b5cf6",
  pink:    "#ec4899",
  slate:   "#64748b",
};

export const CHART_COLORS = [
  "#e53935","#3b82f6","#22c55e","#f59e0b","#8b5cf6",
  "#f97316","#14b8a6","#ec4899","#6366f1","#06b6d4",
  "#84cc16","#a78bfa","#fb923c","#34d399",
];

export const STATUS_COLORS = {
  Open:     { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb", dot: "#3b82f6" },
  Active:   { bg: "#ecfdf5", border: "#a7f3d0", color: "#059669", dot: "#10b981" },
  Pending:  { bg: "#fffbeb", border: "#fde68a", color: "#d97706", dot: "#f59e0b" },
  Resolved: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", dot: "#22c55e" },
  Closed:   { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b", dot: "#94a3b8" },
};

/* ── Helpers ── */
export const fmtNum = n => Number(n || 0).toLocaleString("en-IN");
export const fmtDate = v => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ── Status Badge ── */
export function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status || "—"}
    </span>
  );
}

/* ── KPI Card ── */
const KPI_PALETTE = {
  red:    { bg: "#fff5f5", border: "#fecaca", value: "#e53935", icon: "#fff1f0" },
  blue:   { bg: "#eff6ff", border: "#bfdbfe", value: "#2563eb", icon: "#dbeafe" },
  green:  { bg: "#f0fdf4", border: "#bbf7d0", value: "#16a34a", icon: "#dcfce7" },
  amber:  { bg: "#fffbeb", border: "#fde68a", value: "#d97706", icon: "#fef3c7" },
  purple: { bg: "#faf5ff", border: "#e9d5ff", value: "#7c3aed", icon: "#ede9fe" },
  teal:   { bg: "#f0fdfa", border: "#99f6e4", value: "#0d9488", icon: "#ccfbf1" },
  orange: { bg: "#fff7ed", border: "#fed7aa", value: "#ea580c", icon: "#ffedd5" },
};

export function KpiCard({ label, value, sub, color = "blue", icon, loading, trend }) {
  const p = KPI_PALETTE[color] || KPI_PALETTE.blue;
  return (
    <div className="pg-kpi" style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{label}</div>
          {loading
            ? <div style={{ width: 80, height: 32, background: "#e2e8f0", borderRadius: 6, animation: "pgpulse 1.5s infinite" }} />
            : <div style={{ color: p.value, fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: -0.5, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
          }
          {sub && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{sub}</div>}
          {trend !== undefined && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? "#e53935" : "#16a34a" }}>
                {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>vs last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div style={{ width: 42, height: 42, borderRadius: 12, background: p.icon, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section Card ── */
export function SectionCard({ title, icon, children, extra, style = {}, bodyStyle = {} }) {
  return (
    <div className="pg-section-card" style={style}>
      <div className="pg-section-card-header">
        <div className="pg-section-card-title">
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{title}</span>
        </div>
        {extra}
      </div>
      <div className="pg-section-card-body" style={bodyStyle}>{children}</div>
    </div>
  );
}

/* ── Dark Tooltip for charts ── */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1e293b", border: "none", borderRadius: 10,
      padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    }}>
      {label !== undefined && (
        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill || "#fff", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#94a3b8" }}>{p.name}</span>
          <span>{formatter ? formatter(p.value) : fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Loading Spinner ── */
export function Loading({ height = 200 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height }}>
      <Spin size="large" />
    </div>
  );
}

/* ── Empty state ── */
export function Empty({ text = "No data available" }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{text}</div>
    </div>
  );
}

/* ── Filter Bar ── */
export function FilterBar({ children }) {
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      padding: "14px 16px", background: "#fff",
      border: "1px solid #e8ecf0", borderRadius: 12,
      marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {children}
    </div>
  );
}
