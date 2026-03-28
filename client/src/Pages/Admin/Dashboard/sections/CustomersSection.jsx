// sections/CustomersSection.jsx
import { useState, useMemo } from "react";
import { Table, Tag, Select, Button, Space } from "antd";
import { useOutletContext } from "react-router-dom";
 
import { ExpandAltOutlined } from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell,} from "recharts";
import { ChartTooltip, Loading,  CHART_COLORS, fmtNum } from "../components/shared";
import { useApiQuery, useBatchQuery } from "../components/useApiQuery";
import ChartPreviewModal from "../components/ChartPreviewModal";

/* ── Design tokens ── */
const CHART_SHADOW = {
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  padding: "10px 8px 8px",
  background: "#fff",
};
const LABEL_S = { fontSize: 10, fill: "#475569", fontWeight: 600 };

const STATUS_ORDER = ["Open","Active","Pending","Resolved","Closed"];
const STATUS_COLORS_MAP = { Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8" };

/* ── 3D bar ── */
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

/* ── Chart Card ── */
function ChartCard({ title, icon, tag, tagColor, loading: isLoading, onExpand, children }) {
  return (
    <div className="card" style={{ borderRadius: 14, padding: "12px 4px 8px", background: "transparent" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{title}</span>
          {tag && <Tag color={tagColor} style={{ fontSize: 10, borderRadius: 5, padding: "0 5px", margin: 0 }}>{tag}</Tag>}
        </div>
        {onExpand && (
          <Button type="text" size="small" icon={<ExpandAltOutlined color="blue" />} onClick={onExpand}
            style={{ color: "blue", fontSize: 12, padding: "0 3px" }} />
        )}
      </div>
      <div style={CHART_SHADOW}>
        {isLoading ? <Loading /> : children}
      </div>
    </div>
  );
}

/* ── Grid ── */
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

const ZeroData = ({ msg = "No data available" }) => (
  <div style={{

      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: 160,
      borderRadius: 16,
      background: "linear-gradient(145deg, #f8fafc, #f1f5f9)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
      color: "#64748b",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* Soft Glow */}
    <div
      style={{
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "rgba(59,130,246,0.08)",
        filter: "blur(40px)",
        top: -30,
        right: -30,
      }}
    />

    {/* Icon */}
    <div
      style={{
        fontSize: 36,
        marginBottom: 10,
      }}
    >
      📭
    </div>

    {/* Title */}
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#475569",
        marginBottom: 4,
      }}
    >
      Nothing to show
    </div>

    {/* Subtitle */}
    <div
      style={{
        fontSize: 11,
        color: "#94a3b8",
        textAlign: "center",
        maxWidth: 180,
        lineHeight: 1.4,
      }}
    >
      {msg}
    </div>
  </div>
);

function getRisk(ppm) {
  if (ppm > 40000) return { label: "Critical", color: "error" };
  if (ppm > 10000) return { label: "High",     color: "warning" };
  if (ppm > 2000)  return { label: "Monitor",  color: "processing" };
  return { label: "OK", color: "success" };
}

export default function CustomersSection() {
  const [preview, setPreview] = useState(null);
  const {filters} = useOutletContext();

  const { data, isLoading } = useBatchQuery([
    { key: "customers", url: "/complaints/by-customer", params: { year: filters.year } },
    { key: "custVsStatus", url: "/complaints/customer-vs-status", params: { year: filters.year } },
    { key: "custVsCat", url: "/complaints/customer-vs-category", params: { year: filters.year } },
    { key: "production", url: "/production/list", params: { year: filters.year } },
    { key: "productionStats", url: "/production/stats", params: { year: filters.year } },
  ]);

  const {
    customers = [],
    custVsStatus = [],
    custVsCat = [],
    production = [],
    productionStats = {}
  } = data || {};
  

  // 1. Fix sorting
const sortedByCount = useMemo(() => {
  if (!Array.isArray(customers)) return [];
  return [...customers].sort((a, b) => b.complaints - a.complaints);
}, [customers]);

  const productionMap = {};

  (production || []).forEach(p => {
    productionMap[p.customer] = p.cumulativeProduction || p.production;
  });

  const enrichedCustomers = (customers || []).map(c => {
    const produced = productionMap[c.name] || 0;

    const ppm =
      produced > 0
        ? (c.complaints / produced) * 1_000_000
        : 0;

    return {
      ...c,
      produced,
      ppm: Math.round(ppm),
    };
  });

  const filteredCustVsStatus = useMemo(() =>[...(custVsStatus || [])].sort((a, b) =>
      STATUS_ORDER.reduce((s, st) => s + (b[st] || 0), 0) -
      STATUS_ORDER.reduce((s, st) => s + (a[st] || 0), 0)
    ),
  [custVsStatus]
);

  const openPreview = (title, chart) => setPreview({ title, chart });

  /* ── Charts ── */

const ComplaintsByCustomer = ({ h = 280 }) => {
  if (!enrichedCustomers.length) return <ZeroData />;

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={enrichedCustomers}
        margin={{ top: 20, right: 16, bottom: 10 , left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />

        {/* FIXED */}
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#475569" }}
          angle={-35}
          textAnchor="end"
          height={64}
          interval={0}
        />

        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />

        <Tooltip content={<ChartTooltip />} />

        {/* FIXED */}
        <Bar dataKey="complaints" name="Complaints" radius={[4, 4, 0, 0]}>
          {enrichedCustomers.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}

          <LabelList
            dataKey="complaints"
            position="top"
            style={LABEL_S}
            formatter={fmtNum}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

  const CustomerVsStatus = ({ h = 280 }) => {
    if (!filteredCustVsStatus.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={filteredCustVsStatus} margin={{ top: 20, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={64} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {STATUS_ORDER.map(s => (
            <Bar key={s} dataKey={s} name={s} stackId="a" fill={STATUS_COLORS_MAP[s]}>
              <LabelList dataKey={s} position="center" style={{ fontSize: 10, fill: "#fff", fontWeight: 700 }} formatter={v => v > 10 ? v : ""} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const CustomerVsCategory = ({ h = 280 }) => {
    if (!custVsCat) return <ZeroData />;
    const data = (custVsCat || []).slice(0, 8);
    const cats = Object.keys(data[0] || {}).filter(k => k !== "_id");
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} barCategoryGap="30%" barGap={3} margin={{ top: 20, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={64} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {cats.map((cat, i) => (
            <Bar key={cat} dataKey={cat} name={cat.split(" ")[0]} fill={CHART_COLORS[i]} radius={[3,3,0,0]}
              shape={<Bar3D fill={CHART_COLORS[i]} />}>
              <LabelList dataKey={cat} position="top" style={{ fontSize: 10, fill: "#475569" }} formatter={v => v || ""} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ── PPM bar chart ── */
  const PpmByCustomer = ({ h = 280 }) => {
  const  data = enrichedCustomers.slice(0, 12);

  if (!data.length) return <ZeroData />;

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 16, bottom: 10, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />

        {/* ✅ FIXED */}
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#475569" }}
          angle={-35}
          textAnchor="end"
          height={64}
          interval={0}
        />

        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          width={44}
          tickFormatter={v => fmtNum(v)}
        />

        <Tooltip
          content={<ChartTooltip />}
          formatter={v => [fmtNum(v), "PPM"]}
        />

        <Bar dataKey="ppm" name="PPM Rate" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.ppm > 40000
                  ? "#ef4444"
                  : d.ppm > 10000
                  ? "#f59e0b"
                  : "#22c55e"
              }
            />
          ))}

          <LabelList
            dataKey="ppm"
            position="top"
            style={LABEL_S}
            formatter={fmtNum}
          />
        </Bar>
        
      </BarChart>
    </ResponsiveContainer>
  );
};

  /* ── Table columns ── */
  const tableCols = [
    { title: "#", key: "idx", width: 44, render: (_, __, i) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{i+1}</span> },
    { title: "Brand",      dataIndex: "name",      key: "cust",  render: v => <b style={{ fontSize: 13, color: "#1e293b" }}>{v}</b> },
    { title: "Complaints", dataIndex: "complaints",    key: "count", sorter: (a,b) => b.complaints - a.complaints, defaultSortOrder: "ascend",
      render: v => <span style={{ color: "#e53935", fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{fmtNum(v)}</span> },
    { title: "Produced",   dataIndex: "produced", key: "prod",
      render: v => <span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{v ? fmtNum(v) : "—"}</span> },
    { title: "PPM",        dataIndex: "ppm",      key: "ppm", sorter: (a,b) => b.ppm - a.ppm,
      render: v => <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace", color: v > 10000 ? "#e53935" : "#16a34a" }}>{fmtNum(v)}</span> },
    { title: "Risk", key: "risk", render: (_, r) => { const rk = getRisk(r.ppm); return <Tag color={rk.color} style={{ fontSize: 11, borderRadius: 6, fontWeight: 600 }}>{rk.label}</Tag>; } },
    { title: "Open",    dataIndex: "Open",    key: "open",    render: v => v ? <Tag color="blue"    style={{ fontSize: 11, borderRadius: 6 }}>{v}</Tag> : <Tag color="yellow"    style={{ fontSize: 11, borderRadius: 6 }}>0</Tag> },
    { title: "Pending", dataIndex: "Pending", key: "pend",    render: v => v ? <Tag color="warning" style={{ fontSize: 11, borderRadius: 6 }}>{v}</Tag> : <Tag color="yellow"    style={{ fontSize: 11, borderRadius: 6 }}>0</Tag> },
  ];


  const statusMap = {};
      if (Array.isArray(custVsStatus)) {
        custVsStatus.forEach(s => {
          statusMap[s._id] = s;
        });
      }
  const finalData = customers?.map(c => {
    const produced = productionMap[c.name] || 0;

    const ppm =
      produced > 0
        ? (c.complaints / produced) * 1_000_000
        : 0;

    return {
      ...c,
      ...(statusMap[c.name] || {}),
      produced,
      ppm: Math.round(ppm),
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 80 }}>

      {/* Row 1 — Complaints by Brand + PPM by Brand */}
      <Grid cols={2}>
        <ChartCard title="Complaint Volume by Brand" icon="🏢" loading={isLoading}
          onExpand={() => openPreview("Complaint Volume by Brand", <ComplaintsByCustomer h={420} />)}>
          <ComplaintsByCustomer />
        </ChartCard>

        <ChartCard title="Quality Rating (PPM) by Brand" icon="📉" tag="Lower is Better" tagColor="green" loading={isLoading}
          onExpand={() => openPreview("PPM by Brand", <PpmByCustomer h={420} />)}>
          <PpmByCustomer />
        </ChartCard>
      </Grid>

      {/* Row 2 — Status stacked + Category grouped */}
      <Grid cols={2}>
        <ChartCard title="Complaint Status Breakdown by Brand" icon="📊" tag="Stacked" tagColor="geekblue"
          loading={isLoading} onExpand={() => openPreview("Status by Brand", <CustomerVsStatus h={420} />)}>
          <CustomerVsStatus />
        </ChartCard>

        <ChartCard title="What Defects Each Brand Reports" icon="🔬" tag="Grouped" tagColor="purple"
          loading={isLoading} onExpand={() => openPreview("Defects by Brand", <CustomerVsCategory h={420} />)}>
          <CustomerVsCategory />
        </ChartCard>

      </Grid>

      {/* Row 3 — Performance Table */}
      <div style={{ borderRadius: 14, padding: "12px 4px 8px", background: "transparent" }}>
        <div style={{ padding: "0 8px 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>📋</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Brand Performance Summary</span>
        </div>
        <div style={CHART_SHADOW}>
          <Table
            dataSource={finalData}
            columns={[...tableCols]}
            rowKey="name"
            size="small"
            loading={isLoading}
            className="pg-table"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
          />
        </div>
      </div>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}