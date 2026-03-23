// components/Toast.jsx
export default function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 12,
          background: t.type === "success" ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${t.type === "success" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: "#fff", fontSize: 12, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          animation: "slideIn 0.2s ease",
        }}>
          <span>{t.type === "success" ? "✅" : "⚠️"}</span>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
