// components/ChartPreviewModal.jsx
// Reusable popup that renders an enlarged chart when user clicks on any chart/plot

import { Modal } from "antd";

export default function ChartPreviewModal({ open, onClose, title, subtitle, children }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div>
          <div style={{ color: "#1e293b", fontWeight: 800, fontSize: 16 }}>{title}</div>
          {subtitle && (
            <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: 400, marginTop: 3 }}>
              {subtitle}
            </div>
          )}
        </div>
      }
      footer={null}
      width={860}
      centered
      className="pg-modal"
      styles={{
        body: {
          padding: "20px 24px 24px",
          background: "#fff",
          maxHeight: "78vh",
          overflowY: "auto",
        },
        header: {
          background: "#6366f1",
          borderBottom: "1px solid #6366f1",
          padding: "16px 24px",
        },
      }}
    >
      <div style={{ width: "100%", height: 420 }}>
        {children}
      </div>
    </Modal>
  );
}
