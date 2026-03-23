// components/RiskBadge.jsx
const RISK = {
  Critical: { bg: "#fff5f5", border: "#fecaca", color: "#e53935" },
  High:     { bg: "#fff7ed", border: "#fed7aa", color: "#ea580c" },
  Monitor:  { bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
  OK:       { bg: "#f0fdf4", border: "#bbf7d0", color: "#059669" },
};

export default function RiskBadge({ risk }) {
  const r = RISK[risk] || RISK.OK;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 20,
      background: r.bg, border: `1px solid ${r.border}`,
      color: r.color, fontSize: 10, fontWeight: 700,
    }}>
      {risk}
    </span>
  );
}
