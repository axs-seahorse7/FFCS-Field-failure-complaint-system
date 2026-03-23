// components/DrilldownModal.jsx
import { Modal, Table, Tag, Descriptions, Divider, Statistic, Row, Col } from "antd";
import StatusBadge from "../components/StatusBadge.jsx";
import { fmtNum, fmtDate, CHART_COLORS } from "../components/utils.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from "recharts";

export default function DrilldownModal({ open, onClose, title, subtitle, data, type }) {
  if (!open) return null;

  const renderContent = () => {
    if (!data) return null;

    // TYPE: complaint list (array of complaints)
    if (type === "complaints") {
      const cols = [
        { title: "#", dataIndex: "idx", key: "idx", width: 40, render: (_, __, i) => i + 1 },
        { title: "Complaint No", dataIndex: "complaintNo", key: "complaintNo", render: v => <span style={{ color: "#60a5fa", fontFamily: "DM Mono", fontSize: 11 }}>{v || "—"}</span> },
        { title: "Date", dataIndex: "complaintDate", key: "complaintDate", render: v => fmtDate(v) },
        { title: "Customer", dataIndex: "customerName", key: "customerName", render: v => <b style={{ color: "#1e293b" }}>{v}</b> },
        { title: "Model", dataIndex: "modelName", key: "modelName" },
        { title: "Defect", dataIndex: "defectDetails", key: "defectDetails", ellipsis: true },
        { title: "Part", dataIndex: "defectivePart", key: "defectivePart" },
        { title: "DOA", dataIndex: "doa", key: "doa", render: v => v || "—" },
        { title: "Status", dataIndex: "status", key: "status", render: v => <StatusBadge status={v} /> },
      ];
      return (
        <Table
          dataSource={data}
          columns={cols}
          rowKey={(r) => r._id || r.complaintNo}
          size="small"
          className="pg-table"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 800 }}
        />
      );
    }

    // TYPE: comparison bar chart
    if (type === "comparison") {
      const sorted = [...data].sort((a, b) => b.value - a.value);
      return (
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b", fontFamily: "DM Mono" }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "DM Mono" }} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, fontFamily: "DM Mono", fontSize: 11 }}
                labelStyle={{ color: "#1e293b" }}
                itemStyle={{ color: "#64748b" }}
              />
              <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                {sorted.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                <LabelList dataKey="value" position="right" style={{ fill: "#64748b", fontSize: 10, fontFamily: "DM Mono" }} formatter={fmtNum} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Divider style={{ borderColor: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
          <Row gutter={16}>
            {sorted.map((d, i) => (
              <Col key={d.name} xs={12} sm={8} md={6}>
                <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], marginBottom: 4 }} />
                  <div style={{ color: "#64748b", fontSize: 9, fontFamily: "DM Mono", textTransform: "uppercase", letterSpacing: 1 }}>{d.name}</div>
                  <div style={{ color: "#1e293b", fontWeight: 800, fontSize: 18, marginTop: 2 }}>{fmtNum(d.value)}</div>
                  {d.pct !== undefined && <div style={{ color: "#4a5568", fontSize: 10 }}>{d.pct}%</div>}
                </div>
              </Col>
            ))}
          </Row>
        </div>
      );
    }

    // TYPE: single complaint detail
    if (type === "detail") {
      return (
       <Descriptions
          column={2}
          size="large"
          labelStyle={{ color: "#94a3b8", fontSize: 16, fontFamily: "DM Mono" }}
          contentStyle={{ color: "#1e293b", fontSize: 16, fontWeight: 600 }}
        >
          {Object.entries(data)
            .filter(([key, value]) => {
              if (value === null || value === undefined) return false;

              if (key === "_id" || key.toLowerCase() === "id") return false;

              return true;
            })
            .map(([key, value]) => {
              const label = key.replace(/([A-Z])/g, " $1").trim();

              let content;

              if (key === "createdBy" && value?.email) {
                content = value.email;
              } else if (key === "status") {
                content = <StatusBadge status={value} />;
              } else if (key.includes("Date") || key.includes("At")) {
                content = fmtDate(value);
              } else {
                content = String(value) || "—";
              }

              return (
                <Descriptions.Item key={key} label={label}>
                  {content}
                </Descriptions.Item>
              );
            })}
        </Descriptions>
      );
    }

    return null;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div>
          <div style={{ color: "#1e293b", fontWeight: 800, fontSize: 15 }}>{title}</div>
          {subtitle && <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "DM Mono", fontWeight: 400, marginTop: 2 }}>{subtitle}</div>}
        </div>
      }
      footer={null}
      width={900}
      className="pg-modal"
      centered
      styles={{ body: { padding: "20px", maxHeight: "70vh", overflowY: "auto", background: "#fff" } }}
    >
      {renderContent()}
    </Modal>
  );
}
