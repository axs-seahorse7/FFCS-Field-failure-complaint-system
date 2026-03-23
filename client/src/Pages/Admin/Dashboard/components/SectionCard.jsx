// components/SectionCard.jsx
export default function SectionCard({ title, icon, children, extra, style = {} }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      ...style,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid #f1f5f9",
        background: "#f8fafc",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{
            color: "#64748b", fontSize: 10.5, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            fontFamily: "'DM Mono', monospace",
          }}>
            {title}
          </span>
        </div>
        {extra && <div>{extra}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}
