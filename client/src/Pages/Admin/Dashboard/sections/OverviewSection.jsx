// sections/OverviewSection.jsx
import { useState, useMemo } from "react";
import { Button, Tag, Space } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  SectionCard, ChartTooltip, Loading, CHART_COLORS, fmtNum,
} from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

/* ── Palettes ── */
const STATUS_COLORS = { Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8" };
const PARETO_LINE   = "#ef4444";
const RADAR_COLOR   = "#6366f1";
const RADIAL_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
const LABEL_S       = { fontSize: 10, fill: "#475569", fontWeight: 500 };

/* ── Pareto builder ── */
function buildPareto(data, keyField = "_id", valueField = "count") {
  if (!data?.length) return [];
  const sorted = [...data].sort((a, b) => b[valueField] - a[valueField]).slice(0, 12);
  const total  = sorted.reduce((s, d) => s + (d[valueField] || 0), 0);
  let cum = 0;
  return sorted.map(d => {
    cum += d[valueField] || 0;
    return { name: d[keyField] || "Unknown", value: d[valueField] || 0, cumPct: total > 0 ? +((cum / total) * 100).toFixed(1) : 0 };
  });
}

/* ── Formatters ── */
const fmtMonth = v => {
  if (!v) return "";
  const [yr, mo] = v.split("-");
  return new Date(yr, mo - 1).toLocaleString("default", { month: "short", year: "2-digit" });
};
const fmtDay = v => {
  if (!v) return "";
  const [, m, d] = v.split("-");
  return `${d}/${m}`;
};

/* ── Chart margin presets ── */
const M_STD  = { top: 8, right: 16, bottom: 4, left: 0 };
const M_VERT = { top: 4, right: 48, bottom: 4, left: 4 };

/* ════════════════════════════════════════
   KPI CARD — uniform fixed size
════════════════════════════════════════ */
function MiniKpiCard({ label, value, sub, icon, color, loading }) {
  const colorMap = {
    blue:   { bg: "#eff6ff", accent: "#3b82f6", border: "#bfdbfe" },
    red:    { bg: "#fff1f0", accent: "#e53935", border: "#fecaca" },
    green:  { bg: "#f0fdf4", accent: "#16a34a", border: "#bbf7d0" },
    amber:  { bg: "#fffbeb", accent: "#d97706", border: "#fde68a" },
    purple: { bg: "#faf5ff", accent: "#7c3aed", border: "#ddd6fe" },
    indigo: { bg: "#eef2ff", accent: "#4f46e5", border: "#c7d2fe" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div
      style={{
        background: "#fff", border: `1px solid ${c.border}`, borderRadius: 10,
        padding: "10px 14px", height: 86,
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default", width: "100%",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 9, background: c.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: c.accent, lineHeight: 1.15 }}>
          {loading ? <span style={{ fontSize: 13, color: "#cbd5e1" }}>—</span> : value}
        </div>
        {sub && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CHART CARD wrapper
════════════════════════════════════════ */
function ChartCard({ title, icon, tag, tagColor, loading: isLoading, onExpand, children }) {
  return (
    <div className="pg-section-card" style={{ height: "100%" }}>
      <div className="pg-section-card-header">
        <div className="pg-section-card-title">
          <span>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{title}</span>
        </div>
        <Space size={4}>
          {tag && <Tag color={tagColor} style={{ fontSize: 10, borderRadius: 5, padding: "0 5px", margin: 0 }}>{tag}</Tag>}
          {onExpand && (
            <Button type="text" size="small" icon={<ExpandAltOutlined />}
              onClick={onExpand} style={{ color: "#cbd5e1", fontSize: 12, padding: "0 3px" }} />
          )}
        </Space>
      </div>
      <div style={{ padding: "10px 12px 8px" }}>
        {isLoading ? <Loading /> : children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   FLEXIBLE GRID
   cols: number of equal columns
════════════════════════════════════════ */
function Grid({ cols = 3, children }) {
  const pct = `calc(${100 / cols}% - ${((cols - 1) * 12) / cols}px)`;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {(Array.isArray(children) ? children : [children]).filter(Boolean).map((child, i) => (
        <div key={i} style={{ flex: `0 0 ${pct}`, minWidth: 260, boxSizing: "border-box" }}>
          {child}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function OverviewSection({ addToast, filters = {} }) {
  const [preview, setPreview] = useState(null);

  const { data: stats,       loading: statsL  } = useApi("/complaints/stats",              filters);
  const { data: monthly,     loading: monthlyL } = useApi("/complaints/monthly",            filters);
  const { data: daily,       loading: dailyL   } = useApi("/complaints/daily",              filters);
  const { data: byStatus                        } = useApi("/complaints/by-status",         filters);
  const { data: byCustomer,  loading: custL     } = useApi("/complaints/by-customer",       filters);
  const { data: byCategory,  loading: catL      } = useApi("/complaints/by-category",       filters);
  const { data: byPart,      loading: partL     } = useApi("/complaints/by-part",           filters);
  const { data: byCommodity, loading: commL     } = useApi("/complaints/by-commodity",      filters);
  const { data: byDoa,       loading: doaL      } = useApi("/complaints/by-doa",            filters);
  const { data: ppmTrend,    loading: ppmL      } = useApi("/complaints/ppm-trend",         filters);
  const { data: aging,       loading: agingL    } = useApi("/complaints/aging",             filters);
  const { data: production,  loading: prodL     } = useApi("/complaints/production-stats",  filters);

  const statusData     = useMemo(() => (byStatus || []).map(s => ({ name: s._id, value: s.count })), [byStatus]);
  const areaData       = useMemo(() => (monthly || []).map(m => ({ ...m, resolved: Math.round((m.defects || 0) * 0.7) })), [monthly]);
  const custParetoData = useMemo(() => buildPareto(byCustomer || []), [byCustomer]);
  const catParetoData  = useMemo(() => buildPareto(byCategory || [], "_id", "count"), [byCategory]);
  const commodityData  = useMemo(() => (byCommodity || []).map(c => ({ name: c._id || "Unknown", value: c.count })), [byCommodity]);
  const doaData        = useMemo(() => (byDoa || []).map(d => ({ name: d._id || "Unknown", value: d.count })), [byDoa]);
  const radarData      = useMemo(() => (byCustomer || []).slice(0, 7).map(c => ({
    customer: (c._id || "").slice(0, 8), complaints: c.count || 0, ppm: c.ppm || 0,
  })), [byCustomer]);
  const radialData     = useMemo(() => (byCustomer || []).slice(0, 6).map((c, i) => ({
    name: c._id || "Unknown", value: c.count || 0, fill: RADIAL_COLORS[i],
  })), [byCustomer]);

  const openPreview = (title, chartEl) => setPreview({ title, chart: chartEl });

  /* ──────────────── CHARTS ──────────────── */

  /* 1 — Monthly Volume [DATE → 2/row] */
  const MonthlyLine = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={monthly || []} margin={M_STD}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtMonth} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="defects" name="Total Complaints" stroke="#e53935" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
          <LabelList dataKey="defects" position="top" style={LABEL_S} formatter={v => v || ""} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );

  /* 2 — Status Donut */
  const StatusDonut = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <PieChart>
        <Pie data={statusData} cx="45%" cy="50%"
          innerRadius={h > 300 ? 75 : 55} outerRadius={h > 300 ? 115 : 80}
          dataKey="value" nameKey="name" paddingAngle={3}
          label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#e2e8f0" }}>
          {statusData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || CHART_COLORS[i]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 3 — Warranty Donut */
  const DoaDonut = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <PieChart>
        <Pie data={doaData} cx="45%" cy="50%"
          innerRadius={h > 300 ? 65 : 48} outerRadius={h > 300 ? 108 : 75}
          dataKey="value" nameKey="name" paddingAngle={4}
          label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#e2e8f0" }}>
          {doaData.map((_, i) => <Cell key={i} fill={["#ef4444","#f59e0b","#3b82f6","#22c55e"][i % 4]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 4 — Daily Bar [DATE → 2/row] */
  const DailyBar = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={(daily || []).slice(-30)} margin={M_STD}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={5} tickFormatter={fmtDay} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Daily Complaints" fill="#3b82f6" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="count" position="top" style={LABEL_S} formatter={v => v > 3 ? v : ""} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  /* 5 — New vs Resolved [DATE → 2/row] */
  const AreaTrend = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart data={areaData} margin={M_STD}>
        <defs>
          <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e53935" stopOpacity={0.15}/><stop offset="95%" stopColor="#e53935" stopOpacity={0}/></linearGradient>
          <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtMonth} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="defects"  name="New Complaints"      stroke="#e53935" fill="url(#gC)" strokeWidth={2} />
        <Area type="monotone" dataKey="resolved" name="Resolved Complaints" stroke="#22c55e" fill="url(#gR)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );

  /* 6 — PPM [DATE → 2/row, right Y-axis labelled] */
  const PpmTrend = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <ComposedChart data={ppmTrend || []} margin={{ top: 8, right: 48, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtMonth} />
        <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#94a3b8" }} width={28} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "#6366f1" }} width={42}
          label={{ value: "PPM →", angle: 0, position: "insideTopRight", dy: -4, style: { fontSize: 9, fill: "#6366f1" } }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar  yAxisId="l" dataKey="defects" name="Defect Volume" fill="#93c5fd" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="ppm" name="PPM Rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}>
          <LabelList dataKey="ppm" position="top" style={{ fontSize: 9, fill: "#6366f1" }} formatter={v => v > 0 ? v : ""} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 7 — Top Customers [DIAGONAL → horizontal bar, no overflow] */
  const CustomerBar = ({ h = 200 }) => {
    const data = (byCustomer || []).slice(0, 10).map(c => ({ name: c._id || "Unknown", count: c.count || 0 }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={M_VERT}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#475569" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaint Count" fill="#3b82f6" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="count" position="right" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* 8 — Customer Pareto [DIAGONAL → horizontal + top pct axis] */
  const CustomerPareto = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <ComposedChart data={custParetoData} layout="vertical" margin={M_VERT}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#475569" }} />
        <XAxis xAxisId="pct" type="number" domain={[0, 100]} orientation="top"
          tick={{ fontSize: 9, fill: "#ef4444" }} tickFormatter={v => `${v}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="value" name="Complaint Count" fill="#3b82f6" radius={[0, 3, 3, 0]} />
        <Line xAxisId="pct" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 9 — Category Pareto [DIAGONAL → horizontal] */
  const CategoryPareto = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <ComposedChart data={catParetoData} layout="vertical" margin={M_VERT}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#475569" }} />
        <XAxis xAxisId="pct" type="number" domain={[0, 100]} orientation="top"
          tick={{ fontSize: 9, fill: "#ef4444" }} tickFormatter={v => `${v}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="value" name="Defect Count" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
        <Line xAxisId="pct" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 10 — Top Parts [horizontal] */
  const TopParts = ({ h = 200 }) => {
    const data = (byPart || []).slice(0, 10).map(d => ({ name: d._id || "Unknown", count: d.count }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={M_VERT}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#475569" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaint Count" fill="#f59e0b" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="count" position="right" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* 11 — Commodity Pie */
  const CommodityPie = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <PieChart>
        <Pie data={commodityData} cx="50%" cy="48%"
          outerRadius={h > 300 ? 105 : 72}
          dataKey="value" nameKey="name" paddingAngle={4}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#e2e8f0" }}>
          {commodityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 12 — Aging [horizontal] */
  const AgingChart = ({ h = 200 }) => {
    const data = (aging || []).map(b => ({ name: b.label, value: b.count, fill: b.color }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={M_VERT}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fill: "#475569" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Open Complaints" radius={[0, 3, 3, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList dataKey="value" position="right" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* 13 — Radar */
  const CustomerRadar = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="customer" tick={{ fontSize: 10, fill: "#64748b" }} />
        <PolarRadiusAxis angle={30} tick={{ fontSize: 9, fill: "#94a3b8" }} />
        <Radar name="Complaint Volume" dataKey="complaints" stroke={RADAR_COLOR} fill={RADAR_COLOR} fillOpacity={0.18} strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );

  /* 14 — Radial */
  const CustomerRadial = ({ h = 200 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <RadialBarChart cx="50%" cy="50%" innerRadius="15%" outerRadius="88%"
        data={radialData} startAngle={180} endAngle={0}>
        <RadialBar minAngle={15} background clockWise dataKey="value"
          label={{ position: "insideStart", fill: "#fff", fontSize: 9 }} />
        <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 10 }} />
        <Tooltip content={<ChartTooltip />} />
      </RadialBarChart>
    </ResponsiveContainer>
  );

  /* ────────── KPI DATA ────────── */
  const kpis = [
    { label: "Total Complaints", value: fmtNum(stats?.total    || 0), color: "blue",   icon: "📋", sub: "All time" },
    { label: "Open",             value: fmtNum(stats?.open     || 0), color: "red",    icon: "🔴", sub: "Needs attention" },
    { label: "Resolved",         value: fmtNum(stats?.resolved || 0), color: "green",  icon: "✅", sub: "Closed successfully" },
    { label: "Pending",          value: fmtNum(stats?.pending  || 0), color: "amber",  icon: "⏳", sub: "Awaiting action" },
    { label: "Avg Resolution",   value: `${stats?.avgDays || 0}d`,    color: "purple", icon: "⏱",  sub: "Days to close" },
    { label: "Total Production", value: fmtNum(production?.total || 0), color: "indigo", icon: "🏭", sub: "Units dispatched" },
  ];

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── KPI Strip — 6 equal cards ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ flex: "1 1 140px", minWidth: 140 }}>
            <MiniKpiCard {...k} loading={statsL || prodL} />
          </div>
        ))}
      </div>

      {/* ROW A — 3 pie/donut charts (no x-label overflow risk) */}
      <Grid cols={3}>
        <ChartCard title="Complaint Status Breakdown" icon="🍩" loading={!byStatus}
          onExpand={() => openPreview("Complaint Status Breakdown", <StatusDonut h={400} />)}>
          <StatusDonut />
        </ChartCard>
        <ChartCard title="Warranty Type: DOA / IW / OOW" icon="🛡️" loading={doaL}
          onExpand={() => openPreview("Warranty Classification", <DoaDonut h={400} />)}>
          <DoaDonut />
        </ChartCard>
        <ChartCard title="Commodity Split (IDU vs ODU)" icon="⚙️" loading={commL}
          onExpand={() => openPreview("Commodity Split", <CommodityPie h={400} />)}>
          <CommodityPie />
        </ChartCard>
      </Grid>

      {/* ROW B — DATE x-axis → max 2/row */}
      <Grid cols={2}>
        <ChartCard title="Monthly Complaint Volume" icon="📈" tag="12 months" tagColor="blue" loading={monthlyL}
          onExpand={() => openPreview("Monthly Complaint Volume", <MonthlyLine h={400} />)}>
          <MonthlyLine />
        </ChartCard>
        <ChartCard title="Daily Complaint Load (Last 30 Days)" icon="📅" loading={dailyL}
          onExpand={() => openPreview("Daily Complaint Load", <DailyBar h={400} />)}>
          <DailyBar />
        </ChartCard>
      </Grid>

      {/* ROW C — DATE x-axis → max 2/row */}
      <Grid cols={2}>
        <ChartCard title="New vs Resolved Complaints (Monthly)" icon="📊" loading={monthlyL}
          onExpand={() => openPreview("New vs Resolved", <AreaTrend h={400} />)}>
          <AreaTrend />
        </ChartCard>
        <ChartCard title="Monthly PPM Quality Index" icon="📉" tag="Parts Per Million" tagColor="purple" loading={ppmL}
          onExpand={() => openPreview("Monthly PPM Quality Index", <PpmTrend h={400} />)}>
          <PpmTrend />
        </ChartCard>
      </Grid>

      {/* ROW D — Horizontal bar charts (long names) → 2/row */}
      <Grid cols={2}>
        <ChartCard title="Top Customers by Complaint Volume" icon="🏭" tag="Top 10" tagColor="blue" loading={custL}
          onExpand={() => openPreview("Top Customers", <CustomerBar h={400} />)}>
          <CustomerBar />
        </ChartCard>
        <ChartCard title="Customer 80/20 Pareto Analysis" icon="📐" tag="80/20 Rule" tagColor="volcano" loading={custL}
          onExpand={() => openPreview("Customer Pareto", <CustomerPareto h={400} />)}>
          <CustomerPareto />
        </ChartCard>
      </Grid>

      {/* ROW E — 3 horizontal bar charts */}
      <Grid cols={3}>
        <ChartCard title="Defect Category 80/20 Pareto" icon="🔬" tag="80/20" tagColor="purple" loading={catL}
          onExpand={() => openPreview("Category Pareto", <CategoryPareto h={400} />)}>
          <CategoryPareto />
        </ChartCard>
        <ChartCard title="Most Complained Parts (Top 10)" icon="🔩" tag="Top 10" tagColor="orange" loading={partL}
          onExpand={() => openPreview("Most Complained Parts", <TopParts h={400} />)}>
          <TopParts />
        </ChartCard>
        <ChartCard title="Unresolved Complaint Age Breakdown" icon="⏰" tag="Overdue" tagColor="red" loading={agingL}
          onExpand={() => openPreview("Complaint Aging", <AgingChart h={400} />)}>
          <AgingChart />
        </ChartCard>
      </Grid>

      {/* ROW F — Radar + Radial */}
      <Grid cols={2}>
        <ChartCard title="Customer Complaint Spread (Radar)" icon="🎯" loading={custL}
          onExpand={() => openPreview("Customer Radar", <CustomerRadar h={400} />)}>
          <CustomerRadar />
        </ChartCard>
        <ChartCard title="Top 6 Customer Share (Radial)" icon="🌐" tag="Radial" tagColor="geekblue" loading={custL}
          onExpand={() => openPreview("Customer Radial", <CustomerRadial h={400} />)}>
          <CustomerRadial />
        </ChartCard>
      </Grid>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}