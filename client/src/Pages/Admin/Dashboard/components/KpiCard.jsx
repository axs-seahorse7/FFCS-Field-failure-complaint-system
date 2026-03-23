// components/KpiCard.jsx
import { Skeleton } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

const PALETTE = {
  red:     { bg: "#fff5f5", border: "#fecaca", accent: "#e53935", glow: "rgba(229,57,53,0.08)" },
  blue:    { bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb", glow: "rgba(37,99,235,0.08)" },
  teal:    { bg: "#f0fdfa", border: "#99f6e4", accent: "#0d9488", glow: "rgba(13,148,136,0.08)" },
  amber:   { bg: "#fffbeb", border: "#fde68a", accent: "#d97706", glow: "rgba(217,119,6,0.08)" },
  purple:  { bg: "#faf5ff", border: "#e9d5ff", accent: "#7c3aed", glow: "rgba(124,58,237,0.08)" },
  emerald: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#059669", glow: "rgba(5,150,105,0.08)" },
  orange:  { bg: "#fff7ed", border: "#fed7aa", accent: "#ea580c", glow: "rgba(234,88,12,0.08)" },
};

export default function KpiCard({ label, value, sub, color = "blue", icon, trend, loading }) {
  const p = PALETTE[color] || PALETTE.blue;
  return (
    <div
      style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
      className="pg-kpi"
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${p.glow}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Soft glow orb */}
      <div style={{
        position: "absolute", top: -16, right: -16, width: 70, height: 70,
        borderRadius: "50%", background: p.glow, filter: "blur(18px)", pointerEvents: "none"
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#94a3b8", fontSize: 9, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
            {label}
          </div>
          {loading ? (
            <Skeleton.Input active size="small" style={{ width: 80, height: 28, borderRadius: 6 }} />
          ) : (
            <div style={{ color: p.accent, fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 }}>
              {value}
            </div>
          )}
          {sub && !loading && (
            <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 6 }}>{sub}</div>
          )}
          {trend !== undefined && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              {trend > 0
                ? <ArrowUpOutlined style={{ color: "#e53935", fontSize: 10 }} />
                : <ArrowDownOutlined style={{ color: "#059669", fontSize: 10 }} />
              }
              <span style={{ color: trend > 0 ? "#e53935" : "#059669", fontSize: 10, fontWeight: 700 }}>
                {Math.abs(trend)}%
              </span>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>vs last month</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 22, opacity: 0.5, flexShrink: 0, marginLeft: 8 }}>{icon}</div>
      </div>
    </div>
  );
}
