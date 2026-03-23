// sections/CustomersSection.jsx
import { useState, useMemo } from "react";
import { Row, Col, Table, Tag, Select, Button, Space } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, Cell
} from "recharts";
import { SectionCard, ChartTooltip, Loading, StatusBadge, CHART_COLORS, fmtNum } from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

const { Option } = Select;

const STATUS_ORDER  = ["Open","Active","Pending","Resolved","Closed"];
const STATUS_COLORS_MAP = {
  Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8"
};

function getRisk(ppm) {
  if (ppm > 40000) return { label: "Critical", color: "error" };
  if (ppm > 10000) return { label: "High",     color: "warning" };
  if (ppm > 2000)  return { label: "Monitor",  color: "processing" };
  return { label: "OK", color: "success" };
}

export default function CustomersSection({ addToast }) {
  const [preview, setPreview] = useState(null);

  const { data: customers, loading } = useApi("/complaints/by-customer");
  const { data: custVsStatus }       = useApi("/complaints/customer-vs-status");
  const { data: custVsCat }          = useApi("/complaints/customer-vs-category");

  const sortedByCount = useMemo(() =>
    (customers || []).sort((a, b) => b.count - a.count)
  , [customers]);

  const filteredCustVsStatus = useMemo(() =>
    (custVsStatus || []).sort((a, b) =>
      STATUS_ORDER.reduce((s, st) => s + (b[st] || 0), 0) -
      STATUS_ORDER.reduce((s, st) => s + (a[st] || 0), 0)
    )
  , [custVsStatus]);

  const openPreview = (title, chart, subtitle = "") => setPreview({ title, subtitle, chart });

  const tableCols = [
    { title: "#",          key: "idx",  width: 46, render: (_, __, i) => <span style={{ color: "#94a3b8", fontFamily: "JetBrains Mono", fontSize: 13 }}>{i + 1}</span> },
    { title: "Customer",   dataIndex: "_id",      key: "cust",  render: v => <b style={{ fontSize: 14, color: "#1e293b" }}>{v}</b> },
    { title: "Complaints", dataIndex: "count",    key: "count", sorter: (a, b) => b.count - a.count, defaultSortOrder: "ascend",
      render: v => <span style={{ color: "#e53935", fontWeight: 800, fontSize: 14, fontFamily: "JetBrains Mono" }}>{fmtNum(v)}</span> },
    { title: "Produced",   dataIndex: "produced", key: "prod",
      render: v => <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#475569" }}>{v ? fmtNum(v) : "—"}</span> },
    { title: "PPM",        dataIndex: "ppm",      key: "ppm", sorter: (a, b) => b.ppm - a.ppm,
      render: v => <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "JetBrains Mono", color: v > 10000 ? "#e53935" : "#16a34a" }}>{fmtNum(v)}</span> },
    { title: "Risk",       key: "risk", render: (_, r) => { const rk = getRisk(r.ppm); return <Tag color={rk.color} style={{ fontSize: 12, borderRadius: 8, fontWeight: 600 }}>{rk.label}</Tag>; } },
    { title: "Open",       dataIndex: "open",    key: "open",
      render: v => v ? <Tag color="blue"    style={{ fontSize: 12, borderRadius: 8 }}>{v}</Tag> : <span style={{ color: "#94a3b8" }}>0</span> },
    { title: "Pending",    dataIndex: "pending", key: "pend",
      render: v => v ? <Tag color="warning" style={{ fontSize: 12, borderRadius: 8 }}>{v}</Tag> : <span style={{ color: "#94a3b8" }}>0</span> },
  ];

  // ── Chart builders ──────────────────────────────────────────────────────────

  const ComplaintsByCustomer = ({ height = 300 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedByCount} layout="vertical" margin={{ left: 10, right: 60, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis dataKey="_id" type="category" width={80} tick={{ fontSize: 13, fill: "#475569", fontWeight: 500 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Complaints" radius={[0, 4, 4, 0]}>
          {sortedByCount.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          <LabelList dataKey="count" position="right" style={{ fontSize: 13, fill: "#475569", fontWeight: 700 }} formatter={fmtNum} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const CustomerVsStatus = ({ height = 300 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={filteredCustVsStatus} margin={{ top: 4, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#94a3b8" }} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {STATUS_ORDER.map(s => (
          <Bar key={s} dataKey={s} name={s} stackId="a" fill={STATUS_COLORS_MAP[s]}>
            <LabelList dataKey={s} position="center" style={{ fontSize: 11, fill: "#fff", fontWeight: 700 }} formatter={v => v > 10 ? v : ""} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const CustomerVsCategory = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={(custVsCat || []).slice(0, 8)} barCategoryGap="30%" barGap={3}
        margin={{ top: 8, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#94a3b8" }} angle={-15} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {["ELEC PART DEFECTS","PART BROKEN / DAMAGED / MISSING","LEAK","NOISE","MISC DEFECT"].map((cat, i) => (
          <Bar key={cat} dataKey={cat} name={cat.split(" ")[0]} fill={CHART_COLORS[i]} radius={[3, 3, 0, 0]}>
            <LabelList dataKey={cat} position="top" style={{ fontSize: 11, fill: "#475569" }} formatter={v => v || ""} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const expandBtn = (title, chart, subtitle) => (
    <Button type="text" size="small" icon={<ExpandAltOutlined />}
      onClick={e => { e.stopPropagation(); openPreview(title, chart, subtitle); }}
      style={{ color: "#94a3b8", fontSize: 13 }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SectionCard title="Complaints by Customer" icon="🏢"
            extra={expandBtn("Complaints by Customer", <ComplaintsByCustomer height={400} />)}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Complaints by Customer", <ComplaintsByCustomer height={400} />)}>
              {loading ? <Loading /> : <ComplaintsByCustomer />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="Customer vs Status (Stacked)" icon="📊"
            extra={expandBtn("Customer vs Status", <CustomerVsStatus height={400} />)}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Customer vs Status (Stacked)", <CustomerVsStatus height={400} />)}>
              {!custVsStatus ? <Loading /> : <CustomerVsStatus />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="Customer vs Defect Category (Grouped)" icon="📊"
        extra={expandBtn("Customer vs Defect Category", <CustomerVsCategory height={400} />)}>
        <div style={{ cursor: "pointer" }} onClick={() => openPreview("Customer vs Defect Category", <CustomerVsCategory height={400} />)}>
          {!custVsCat ? <Loading height={260} /> : <CustomerVsCategory />}
        </div>
      </SectionCard>

      <SectionCard title="Customer Performance Summary" icon="📋">
        <Table
          dataSource={sortedByCount}
          columns={tableCols}
          rowKey="_id"
          size="middle"
          loading={loading}
          className="pg-table"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 800 }}
        />
      </SectionCard>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title} subtitle={preview?.subtitle}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}
