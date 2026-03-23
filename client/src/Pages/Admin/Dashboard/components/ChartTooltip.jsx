// components/ChartTooltip.jsx
import { fmtNum } from "./utils";

export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(13,18,36,0.97)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 14px",
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {label !== undefined && (
        <div style={{ color: "#64748b", marginBottom: 6, fontWeight: 700, fontSize: 10 }}>{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill || "#e2e8f0", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span>{p.name}</span>
          <b>{formatter ? formatter(p.value, p.name) : fmtNum(p.value)}</b>
        </div>
      ))}
    </div>
  );
}
