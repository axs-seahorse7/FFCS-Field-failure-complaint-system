// components/StatusBadge.jsx
const STATUS = {
  Open:     { bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb", dot: "#3b82f6" },
  Active:   { bg: "#f0fdf4", border: "#bbf7d0", color: "#059669", dot: "#10b981" },
  Pending:  { bg: "#fffbeb", border: "#fde68a", color: "#d97706", dot: "#f59e0b" },
  Resolved: { bg: "#f0fdfa", border: "#99f6e4", color: "#0d9488", dot: "#14b8a6" },
  Closed:   { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b", dot: "#94a3b8" },
  Blocked:  { bg: "#fff5f5", border: "#fecaca", color: "#e53935", dot: "#ef4444" },
  TBC:      { bg: "#faf5ff", border: "#e9d5ff", color: "#7c3aed", dot: "#8b5cf6" },
};

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.Open;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 10, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {status || "—"}
    </span>
  );
}
