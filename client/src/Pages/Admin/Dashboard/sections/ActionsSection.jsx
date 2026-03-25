// sections/ActionsSection.jsx
import { useState, useMemo } from "react";
import { Table, Tag, Select, Button, Space } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell, LineChart, Line,
} from "recharts";
import { ChartTooltip, Loading, StatusBadge, CHART_COLORS, fmtNum, fmtDate } from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";
import api from "../../../../services/axios-interceptore/api.js";

const { Option } = Select;

/* ── Shared design tokens ── */
const CHART_SHADOW = {
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  padding: "10px 8px 8px",
  background: "#fff",
};
const LABEL_S = { fontSize: 10, fill: "#475569", fontWeight: 600 };

/* ── Custom 3D bar shape ── */
const Bar3D = ({ x, y, width, height, fill }) => {
  if (!height || height <= 0) return null;
  const d = 4;
  return (
    <g>
      <polygon points={`${x+width},${y} ${x+width+d},${y-d} ${x+width+d},${y+height-d} ${x+width},${y+height}`} fill={fill} opacity={0.4} />
      <polygon points={`${x},${y} ${x+width},${y} ${x+width+d},${y-d} ${x+d},${y-d}`} fill={fill} opacity={0.65} />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
    </g>
  );
};

/* ── Chart Card (no background wrapper, just shadow on chart area) ── */
function ChartCard({ title, icon, tag, tagColor, loading: isLoading, onExpand, headerExtra, children, minHeight }) {
  return (
    <div style={{ borderRadius: 14, padding: "12px 4px 8px", background: "transparent", minHeight: minHeight || "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{title}</span>
          {tag && <Tag color={tagColor} style={{ fontSize: 10, borderRadius: 5, padding: "0 5px", margin: 0 }}>{tag}</Tag>}
        </div>
        <Space size={4}>
          {headerExtra}
          {onExpand && (
            <Button type="text" size="small" icon={<ExpandAltOutlined />} onClick={onExpand}
              style={{ color: "#cbd5e1", fontSize: 12, padding: "0 3px" }} />
          )}
        </Space>
      </div>
      <div style={CHART_SHADOW}>
        {isLoading ? <Loading /> : children}
      </div>
    </div>
  );
}

/* ── Grid helper ── */
function Grid({ cols = 2, children }) {
  const pct = `calc(${100 / cols}% - ${((cols - 1) * 12) / cols}px)`;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {(Array.isArray(children) ? children : [children]).filter(Boolean).map((child, i) => (
        <div key={i} style={{ flex: `0 0 ${pct}`, minWidth: 260, boxSizing: "border-box" }}>{child}</div>
      ))}
    </div>
  );
}

const AGING_COLORS = { "0–2 days": "#22c55e", "3–7 days": "#f59e0b", "8–14 days": "#f97316", "15–30 days": "#e53935", "30+ days": "#7c3aed" };

export default function ActionsSection({ addToast }) {
  const [statusFilter, setStatusFilter] = useState("Open");
  const [updatingId, setUpdatingId]     = useState(null);
  const [preview, setPreview]           = useState(null);

  const { data: byUser,    loading: userLoading }            = useApi("/complaints/by-created-user");
  const { data: byUpdater, loading: updLoading }             = useApi("/complaints/by-updated-user");
  const { data: pending,   loading: pendLoading, refetch }   = useApi("/get-complaint", { status: statusFilter, limit: 100 });
  const { data: stats }                                      = useApi("/complaints/stats");
  const { data: aging }                                      = useApi("/complaints/aging");
console.log("Aging data:", aging);
  const agingData = useMemo(() => {
    if (aging) return aging;
    return [];
  }, [aging]);

  const agingTotal = useMemo(() => (agingData || []).reduce((s, b) => s + (b.count || 0), 0), [agingData]);
  const agingPct   = useMemo(() => (agingData || []).map(b => ({
    ...b, pct: agingTotal > 0 ? +((b.count / agingTotal) * 100).toFixed(1) : 0,
  })), [agingData, agingTotal]);

  const sortedByUser    = useMemo(() => (byUser    || []).sort((a, b) => b.count - a.count), [byUser]);
  const sortedByUpdater = useMemo(() => (byUpdater || []).sort((a, b) => b.count - a.count), [byUpdater]);

  const openPreview = (title, chart) => setPreview({ title, chart });

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.post("/complaints/status", { id, status });
      addToast(`Status → "${status}"`, "success");
      refetch({ status: statusFilter, limit: 100 });
    } catch { addToast("Update failed", "error"); }
    finally { setUpdatingId(null); }
  };

  /* ── KPI mini cards ── */
  const kpis = [
    { label: "SLA Breached",   value: fmtNum(stats?.slaBreach  || 0), color: "#ef4444", bg: "#fff1f0", border: "#fecaca", icon: "🚨", sub: "> 7 days open" },
    { label: "Active Cases",   value: fmtNum(stats?.active     || 0), color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", icon: "⚡", sub: "In progress" },
    { label: "Avg Resolution", value: `${stats?.avgDays || 0}d`,       color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", icon: "⏱", sub: "Days to close" },
    { label: "Closed Today",   value: fmtNum(stats?.closedToday || 0), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅", sub: "Resolved today" },
  ];

  /* ── Charts ── */

  const AgingChart = ({ h = 260 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={agingPct} margin={{ top: 24, right: 16, bottom: 8, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569" }} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={36} tickFormatter={v => `${v}%`} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} formatter={v => [`${v}%`, "Share"]} />
        <Bar dataKey="pct" name="% of Unresolved" radius={[4, 4, 0, 0]}
          label={{ position: "top", style: { fontSize: 10, fill: "#475569", fontWeight: 700 }, formatter: v => `${v}%` }}>
          {agingPct.map((d, i) => (
            <Cell key={i} fill={d.color || AGING_COLORS[d.label] || CHART_COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const LoggedByUserChart = ({ h = 280 }) => {
    const data = sortedByUser.slice(0, 10).map(u => ({ name: (u.email || "").split("@")[0], count: u.count }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} margin={{ top: 24, right: 16, bottom: 60, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} angle={-35} textAnchor="end" height={64} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaints Logged" fill="#3b82f6" radius={[4, 4, 0, 0]}
            shape={<Bar3D fill="#3b82f6" />}>
            <LabelList dataKey="count" position="top" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const HandledByUserChart = ({ h = 280 }) => {
    const data = sortedByUpdater.slice(0, 10).map(u => ({ name: (u.email || "").split("@")[0], count: u.count }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} margin={{ top: 24, right: 16, bottom: 60, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} angle={-35} textAnchor="end" height={64} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaints Handled" fill="#22c55e" radius={[4, 4, 0, 0]}
            shape={<Bar3D fill="#22c55e" />}>
            <LabelList dataKey="count" position="top" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ── Table columns ── */
  const pendingCols = [
    { title: "#", key: "i", width: 44, render: (_, __, i) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{i + 1}</span> },
    { title: "Complaint No", dataIndex: "complaintNo", key: "cno", width: 150,
      render: v => <span style={{ color: "#2563eb", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{v || "—"}</span> },
    { title: "Date", dataIndex: "createdAt", key: "date", width: 100,
      render: v => <span style={{ fontSize: 12, color: "#475569" }}>{fmtDate(v)}</span> },
    { title: "Age", key: "age", width: 90,
      render: (_, r) => {
        const days = Math.floor((Date.now() - new Date(r.createdAt)) / 86400000);
        return <Tag color={days > 30 ? "error" : days > 14 ? "warning" : days > 7 ? "orange" : "success"}
          style={{ fontSize: 11, borderRadius: 6, fontWeight: 700 }}>{days}d</Tag>;
      },
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    { title: "Customer", dataIndex: "customerName", key: "cust",
      render: v => <b style={{ fontSize: 13, color: "#1e293b" }}>{v}</b> },
    { title: "Defect", dataIndex: "defectDetails", key: "defect", ellipsis: true,
      render: v => <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span> },
    { title: "Status", dataIndex: "status", key: "status", render: v => <StatusBadge status={v} /> },
    { title: "Update", key: "change", width: 130, fixed: "right",
      render: (_, r) => (
        <Select size="small" value={r.status} loading={updatingId === r._id}
          onChange={v => updateStatus(r._id, v)} onClick={e => e.stopPropagation()} style={{ width: 115 }}>
          {["Open","Active","Pending","Resolved","Closed"].map(s => <Option key={s}>{s}</Option>)}
        </Select>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 80 }}>

      {/* ── KPI Strip ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ flex: "1 1 160px", minWidth: 160 }}>
            <div style={{
              background: "#fff", border: `1px solid ${k.border}`, borderRadius: 10,
              padding: "10px 14px", height: 86, display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
              transition: "box-shadow 0.2s, transform 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 9, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{k.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1.2 }}>{!stats ? "—" : k.value}</div>
                {k.sub && <div style={{ fontSize: 10, color: "#94a3b8" }}>{k.sub}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Aging + Logged by User ── */}
      <Grid cols={2}>
        <ChartCard title="How Long Complaints Stay Unresolved" icon="⏰" tag="Age %" tagColor="red"
          loading={!aging} onExpand={() => openPreview("Complaint Age Breakdown", <AgingChart h={400} />)}>
          <AgingChart />
        </ChartCard>
        <ChartCard title="Who Logged the Most Complaints" icon="👤" tag="Top 10" tagColor="blue"
          loading={userLoading} onExpand={() => openPreview("Logged by User", <LoggedByUserChart h={400} />)}>
          <LoggedByUserChart />
        </ChartCard>
      </Grid>

      {/* ── Row 2: Handled by User (full width) ── */}
      <ChartCard title="Who Handled & Updated Complaints" icon="🛠️" tag="Top 10" tagColor="green"
        loading={updLoading} onExpand={() => openPreview("Handled by User", <HandledByUserChart h={400} />)}>
        <HandledByUserChart />
      </ChartCard>

      {/* ── Open / Pending Table ── */}
      <div style={{ borderRadius: 14, padding: "12px 4px 8px", background: "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>📋</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Live Complaint Queue</span>
          </div>
          <Select className="pg-select" value={statusFilter} onChange={setStatusFilter} size="small" style={{ width: 130 }}>
            {["Open","Active","Pending","Resolved","Closed"].map(s => <Option key={s}>{s}</Option>)}
          </Select>
        </div>
        <div style={CHART_SHADOW}>
          <Table
            dataSource={pending || []}
            columns={pendingCols}
            rowKey={r => r._id}
            size="small"
            loading={pendLoading}
            className="pg-table"
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: t => <span style={{ fontSize: 12, color: "#64748b" }}>{fmtNum(t)} records</span> }}
            scroll={{ x: 900 }}
          />
        </div>
      </div>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}