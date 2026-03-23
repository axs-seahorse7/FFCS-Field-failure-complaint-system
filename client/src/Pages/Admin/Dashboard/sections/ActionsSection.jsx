// sections/ActionsSection.jsx
import { useState, useMemo } from "react";
import { Row, Col, Table, Tag, Select, Button } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell
} from "recharts";
import { KpiCard, SectionCard, ChartTooltip, Loading, StatusBadge, CHART_COLORS, fmtNum, fmtDate } from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";
import api from "../../../../services/axios-interceptore/api.js";

const { Option } = Select;

const AGING_BUCKETS = [
  { label: "0–2 days",   min: 0,  max: 2,        color: "#22c55e" },
  { label: "3–7 days",   min: 3,  max: 7,        color: "#f59e0b" },
  { label: "8–14 days",  min: 8,  max: 14,       color: "#f97316" },
  { label: "15–30 days", min: 15, max: 30,       color: "#e53935" },
  { label: "30+ days",   min: 31, max: Infinity, color: "#7c3aed" },
];

export default function ActionsSection({ addToast }) {
  const [statusFilter, setStatusFilter] = useState("Open");
  const [updatingId, setUpdatingId]     = useState(null);
  const [preview, setPreview]           = useState(null);

  const { data: byUser,    loading: userLoading }                          = useApi("/complaints/by-created-user");
  const { data: byUpdater, loading: updLoading }                           = useApi("/complaints/by-updated-user");
  const { data: pending,   loading: pendLoading, refetch }                 = useApi("/get-complaint", { status: statusFilter, limit: 100 });
  const { data: stats }                                                    = useApi("/complaints/stats");
  const { data: aging }                                                    = useApi("/complaints/aging");

  const agingData = useMemo(() => {
    if (aging) return aging;
    const open = (pending || []).filter(c => ["Open","Active","Pending"].includes(c.status));
    return AGING_BUCKETS.map(bucket => ({
      label: bucket.label,
      count: open.filter(c => {
        const days = Math.floor((Date.now() - new Date(c.createdAt)) / 86400000);
        return days >= bucket.min && days <= bucket.max;
      }).length,
      color: bucket.color,
    }));
  }, [aging, pending]);

  const sortedByUser    = useMemo(() => (byUser    || []).sort((a, b) => b.count - a.count), [byUser]);
  const sortedByUpdater = useMemo(() => (byUpdater || []).sort((a, b) => b.count - a.count), [byUpdater]);

  const openPreview = (title, chart, subtitle = "") => setPreview({ title, subtitle, chart });

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.post("/complaints/status", { id, status });
      addToast(`Status → "${status}"`, "success");
      refetch({ status: statusFilter, limit: 100 });
    } catch { addToast("Update failed", "error"); }
    finally { setUpdatingId(null); }
  };

  const kpis = [
    { label: "SLA Breached",   value: fmtNum(stats?.slaBreach || 0),  color: "red",   icon: "🚨", sub: "> 7 days open" },
    { label: "Active Cases",   value: fmtNum(stats?.active    || 0),  color: "teal",  icon: "⚡" },
    { label: "Avg Resolution", value: `${stats?.avgDays || 0}d`,       color: "blue",  icon: "⏱" },
    { label: "Closed Today",   value: fmtNum(stats?.closedToday || 0), color: "green", icon: "✅" },
  ];

  const pendingCols = [
    { title: "#",           key: "i",  width: 44, render: (_,__,i) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{i+1}</span> },
    { title: "Complaint No", dataIndex: "complaintNo", key: "cno", width: 150,
      render: v => <span style={{ color: "#2563eb", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}>{v || "—"}</span> },
    { title: "Date",         dataIndex: "createdAt",   key: "date", width: 110,
      render: v => <span style={{ fontSize: 13, color: "#475569" }}>{fmtDate(v)}</span> },
    { title: "Age (days)",   key: "age", width: 110,
      render: (_, r) => {
        const days = Math.floor((Date.now() - new Date(r.createdAt)) / 86400000);
        return <Tag color={days > 30 ? "error" : days > 14 ? "warning" : days > 7 ? "orange" : "success"}
          style={{ fontSize: 13, borderRadius: 8, fontWeight: 700 }}>{days}d</Tag>;
      },
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    { title: "Customer",  dataIndex: "customerName", key: "cust",
      render: v => <b style={{ fontSize: 14, color: "#1e293b" }}>{v}</b> },
    { title: "Defect",    dataIndex: "defectDetails", key: "defect", ellipsis: true,
      render: v => <span style={{ fontSize: 13, color: "#64748b" }}>{v}</span> },
    { title: "Status",    dataIndex: "status", key: "status", render: v => <StatusBadge status={v} /> },
    { title: "Change", key: "change", width: 140, fixed: "right",
      render: (_, r) => (
        <Select size="small" value={r.status} loading={updatingId === r._id}
          onChange={v => updateStatus(r._id, v)} onClick={e => e.stopPropagation()}
          style={{ width: 120 }}>
          {["Open","Active","Pending","Resolved","Closed"].map(s => <Option key={s}>{s}</Option>)}
        </Select>
      )
    },
  ];

  // ── Chart builders ──────────────────────────────────────────────────────────

  const AgingChart = ({ height = 250 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={agingData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Complaints" radius={[6, 6, 0, 0]}>
          {agingData.map((d, i) => <Cell key={i} fill={d.color || CHART_COLORS[i]} />)}
          <LabelList dataKey="count" position="top" style={{ fontSize: 13, fill: "#475569", fontWeight: 700 }} formatter={v => v || ""} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const LoggedByUserChart = ({ height = 250 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedByUser.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 60, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis dataKey="email" type="category" width={160} tick={{ fontSize: 12, fill: "#475569" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Logged" fill="#3b82f6" radius={[0, 6, 6, 0]}>
          <LabelList dataKey="count" position="right" style={{ fontSize: 13, fill: "#475569", fontWeight: 700 }} formatter={fmtNum} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const HandledByUserChart = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedByUpdater.slice(0, 10)} margin={{ top: 8, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="email" tick={{ fontSize: 12, fill: "#94a3b8" }} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Handled" fill="#22c55e" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 13, fill: "#475569", fontWeight: 700 }} formatter={fmtNum} />
        </Bar>
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

      <Row gutter={[14, 14]}>
        {kpis.map(k => (
          <Col key={k.label} xs={12} lg={6}><KpiCard {...k} loading={!stats} /></Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="Open Complaint Aging" icon="⏳"
            extra={expandBtn("Open Complaint Aging", <AgingChart height={380} />, "Days since created")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Open Complaint Aging", <AgingChart height={380} />)}>
              <AgingChart />
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="Complaints Logged by User" icon="👤"
            extra={expandBtn("Logged by User", <LoggedByUserChart height={380} />)}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Complaints Logged by User", <LoggedByUserChart height={380} />)}>
              {userLoading ? <Loading /> : <LoggedByUserChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="Complaints Handled / Updated by User" icon="🛠"
        extra={expandBtn("Handled by User", <HandledByUserChart height={380} />)}>
        <div style={{ cursor: "pointer" }} onClick={() => openPreview("Handled / Updated by User", <HandledByUserChart height={380} />)}>
          {updLoading ? <Loading height={220} /> : <HandledByUserChart />}
        </div>
      </SectionCard>

      <SectionCard title="Open / Pending Complaints" icon="📋"
        extra={
          <Select className="pg-select" value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}>
            {["Open","Active","Pending","Resolved","Closed"].map(s => <Option key={s}>{s}</Option>)}
          </Select>
        }
      >
        <Table
          dataSource={pending || []}
          columns={pendingCols}
          rowKey={r => r._id}
          size="middle"
          loading={pendLoading}
          className="pg-table"
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: t => <span style={{ fontSize: 13, color: "#64748b" }}>{fmtNum(t)} records</span> }}
          scroll={{ x: 900 }}
        />
      </SectionCard>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title} subtitle={preview?.subtitle}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}
