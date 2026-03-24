// sections/OverviewSection.jsx
import { useState, useMemo } from "react";
import { Row, Col, Select, DatePicker, Button, Tag, Space, Tooltip as AntTooltip } from "antd";
import { ReloadOutlined, ExpandAltOutlined } from "@ant-design/icons";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
  ComposedChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, FunnelChart, Funnel,
} from "recharts";
import {
  KpiCard, SectionCard, ChartTooltip, Loading, FilterBar, CHART_COLORS, fmtNum, StatusBadge,
} from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

const { RangePicker } = DatePicker;
const { Option } = Select;

/* ── Color palettes ─────────────────────────────────────────────── */
const STATUS_PIE_COLORS = {
  Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8",
};
const PARETO_BAR   = "#3b82f6";
const PARETO_LINE  = "#ef4444";
const RADAR_COLOR  = "#6366f1";
const RADIAL_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

/* ── Shared label style ──────────────────────────────────────────── */
const LABEL_STYLE = { fontSize: 12, fill: "#475569", fontWeight: 500 };

/* ── Pareto helper ───────────────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function OverviewSection({ addToast }) {
  const [customer,  setCustomer]  = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [preview,   setPreview]   = useState(null);

  /* ── Shared params ─────────────────────────────────────────────── */
  const params = useMemo(() => {
    const p = {};
    if (customer)       p.customerName = customer;
    if (dateRange?.[0]) p.from = dateRange[0].toISOString();
    if (dateRange?.[1]) p.to   = dateRange[1].toISOString();
    return p;
  }, [customer, dateRange]);

  /* ── API calls (all original + new) ─────────────────────────────── */
  const { data: stats,       loading: statsLoading,   refetch: rStats   } = useApi("/complaints/stats",              params);
  const { data: monthly,     loading: monthlyLoading, refetch: rMonthly } = useApi("/complaints/monthly",            params);
  const { data: daily,       loading: dailyLoading                      } = useApi("/complaints/daily",              params);
  const { data: byStatus                                                 } = useApi("/complaints/by-status",         params);
  const { data: byCustomer,  loading: customerLoading                   } = useApi("/complaints/by-customer",        params);
  const { data: byCategory,  loading: categoryLoading                   } = useApi("/complaints/by-category",        params);
  const { data: byPart,      loading: partLoading                       } = useApi("/complaints/by-part",            params);
  const { data: byCommodity, loading: commodityLoading                  } = useApi("/complaints/by-commodity",       params);
  const { data: byDoa,       loading: doaLoading                        } = useApi("/complaints/by-doa",             params);
  const { data: ppmTrend,    loading: ppmLoading                        } = useApi("/complaints/ppm-trend",          params);
  const { data: aging,       loading: agingLoading                      } = useApi("/complaints/aging",              params);
  const { data: topDefects,  loading: topDefectsLoading                 } = useApi("/complaints/top-defects",        params);

  /* ── Refresh handler ─────────────────────────────────────────────── */
  const handleRefresh = () => { rStats(params); rMonthly(params); };

  /* ── Derived data ─────────────────────────────────────────────── */
  const statusData = useMemo(() =>
    (byStatus || []).map(s => ({ name: s._id, value: s.count }))
  , [byStatus]);

  const areaData = useMemo(() =>
    (monthly || []).map(m => ({ ...m, resolved: Math.round((m.defects || 0) * 0.7) }))
  , [monthly]);

  const customerParetoData = useMemo(() => buildPareto(byCustomer || []), [byCustomer]);
  const categoryParetoData = useMemo(() => buildPareto(byCategory || [], "_id", "count"), [byCategory]);
  const partParetoData     = useMemo(() => buildPareto(byPart     || [], "_id", "count"), [byPart]);
  const topDefectsPareto   = useMemo(() => buildPareto(topDefects || [], "_id", "count"), [topDefects]);

  const commodityData = useMemo(() =>
    (byCommodity || []).map(c => ({ name: c._id || "Unknown", value: c.count }))
  , [byCommodity]);

  const doaData = useMemo(() =>
    (byDoa || []).map(d => ({ name: d._id || "Unknown", value: d.count }))
  , [byDoa]);

  const radarData = useMemo(() => {
    if (!byCustomer?.length) return [];
    return (byCustomer || []).slice(0, 7).map(c => ({
      customer: (c._id || "").length > 8 ? (c._id || "").slice(0, 8) : c._id,
      complaints: c.count || 0,
      ppm: c.ppm || 0,
    }));
  }, [byCustomer]);

  const radialData = useMemo(() =>
    (byCustomer || []).slice(0, 6).map((c, i) => ({
      name:  c._id || "Unknown",
      value: c.count || 0,
      fill:  RADIAL_COLORS[i % RADIAL_COLORS.length],
    }))
  , [byCustomer]);

  /* ── KPIs (all original) ─────────────────────────────────────────── */
  const kpis = [
    { label: "Total Complaints", value: fmtNum(stats?.total    || 0), color: "blue",   icon: "📋", sub: "All time" },
    { label: "Open",             value: fmtNum(stats?.open     || 0), color: "red",    icon: "🔴", sub: "Needs attention", trend: 5 },
    { label: "Resolved",         value: fmtNum(stats?.resolved || 0), color: "green",  icon: "✅", sub: "Completed" },
    { label: "Pending",          value: fmtNum(stats?.pending  || 0), color: "amber",  icon: "⏳", sub: "In progress" },
    { label: "Avg Resolution",   value: `${stats?.avgDays || 0}d`,    color: "purple", icon: "⏱", sub: "Days to close" },
  ];

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const openPreview = (title, chartEl, subtitle = "") =>
    setPreview({ title, subtitle, chart: chartEl });

  const expandBtn = (title, chartEl, subtitle) => (
    <Button
      type="text" size="small"
      icon={<ExpandAltOutlined />}
      onClick={() => openPreview(title, chartEl, subtitle)}
      style={{ color: "#94a3b8", fontSize: 13 }}
    />
  );

  /* ════════════════════════════════════════════════════════════════
     CHART BUILDERS
  ════════════════════════════════════════════════════════════════ */

  /* 1 ── Monthly Line Chart (original) */
  const MonthlyLineChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={monthly || []} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis 
          dataKey="m" 
          tick={{ fontSize: 12, fill: "#94a3b8" }} 
          tickFormatter={(value) => {
            const [year, month] = value.split("-");
            const date = new Date(year, month - 1);
            return `${date.toLocaleString("default", { month: "short" })} ${year}`;
          }}
        />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line type="monotone" dataKey="defects" name="Complaints" stroke="#e53935" strokeWidth={2.5}
          dot={{ r: 4, fill: "#e53935" }} activeDot={{ r: 6 }}>
          <LabelList dataKey="defects" position="top" style={LABEL_STYLE} formatter={v => v || ""} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );

  /* 2 ── Status Donut (original) */
  const StatusDonutChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={statusData} cx="45%" cy="50%"
          innerRadius={height > 300 ? 80 : 60} outerRadius={height > 300 ? 120 : 95}
          dataKey="value" nameKey="name" paddingAngle={3}
          label={({ name, value }) => `${name}: ${value}`}
          labelLine={{ stroke: "#e2e8f0" }}
        >
          {statusData.map((d, i) => <Cell key={i} fill={STATUS_PIE_COLORS[d.name] || CHART_COLORS[i]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 3 ── Daily Bar Chart (original) */
  const DailyBarChart = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={(daily || []).slice(-30)} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis
  dataKey="d"
  tick={{ fontSize: 11, fill: "#94a3b8" }}
  interval={4}
  tickFormatter={(value) => {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`; // 24-03-2026
  }}
/>
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Complaints" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" style={LABEL_STYLE} formatter={v => v > 5 ? v : ""} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  /* 4 ── Area Trend Chart (original) */
  const AreaTrendChart = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={areaData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradCreated"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#e53935" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#e53935" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Area type="monotone" dataKey="defects"  name="Created"  stroke="#e53935" fill="url(#gradCreated)"  strokeWidth={2} />
        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fill="url(#gradResolved)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );

  /* 5 ── Customer Pareto Chart (NEW) */
  const CustomerParetoChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={customerParetoData} margin={{ top: 10, right: 30, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-35} textAnchor="end" interval={0} />
        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]}
          tick={{ fontSize: 12, fill: "#ef4444" }} tickFormatter={v => `${v}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="left" dataKey="value" name="Complaints" fill={PARETO_BAR} radius={[4,4,0,0]} />
        <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE}
          strokeWidth={2.5} dot={{ r: 4, fill: PARETO_LINE }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 6 ── Category Pareto (NEW) */
  const CategoryParetoChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={categoryParetoData} margin={{ top: 10, right: 30, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-30} textAnchor="end" interval={0} />
        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]}
          tick={{ fontSize: 12, fill: "#ef4444" }} tickFormatter={v => `${v}%`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="left" dataKey="value" name="Count" fill="#8b5cf6" radius={[4,4,0,0]} />
        <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE}
          strokeWidth={2.5} dot={{ r: 4, fill: PARETO_LINE }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 7 ── Top Defective Parts — Horizontal Bar (NEW) */
  const TopPartsChart = ({ height = 280 }) => {
    const data = (byPart || []).slice(0, 10).map(d => ({ name: d._id || "Unknown", count: d.count }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#475569" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaints" fill="#f59e0b" radius={[0,4,4,0]}>
            <LabelList dataKey="count" position="right" style={LABEL_STYLE} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* 8 ── Commodity Split — Pie (NEW) */
  const CommodityPieChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={commodityData} cx="50%" cy="48%"
          outerRadius={height > 300 ? 110 : 88}
          dataKey="value" nameKey="name" paddingAngle={4}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: "#e2e8f0" }}
        >
          {commodityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 9 ── DOA / IW / OOW — Donut (NEW) */
  const DoaDonutChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={doaData} cx="50%" cy="48%"
          innerRadius={height > 300 ? 70 : 55} outerRadius={height > 300 ? 110 : 88}
          dataKey="value" nameKey="name" paddingAngle={4}
          label={({ name, value }) => `${name}: ${value}`}
          labelLine={{ stroke: "#e2e8f0" }}
        >
          {doaData.map((_, i) => <Cell key={i} fill={["#ef4444","#f59e0b","#3b82f6","#22c55e"][i % 4]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 10 ── PPM Trend — Composed Line + Bar (NEW) */
  const PpmTrendChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={ppmTrend || []} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis 
          dataKey="m"
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          tickFormatter={(value) => {
            if (!value) return "";
            const [year, month] = value.split("-");
            const date = new Date(year, month - 1);
            return `${date.toLocaleString("default", { month: "short" })} ${year}`;
          }}
        />
        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#6366f1" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar  yAxisId="left"  dataKey="defects" name="Defects"  fill="#93c5fd" radius={[4,4,0,0]} />
        <Line yAxisId="right" type="monotone" dataKey="ppm" name="PPM" stroke="#6366f1"
          strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }}>
          <LabelList dataKey="ppm" position="top" style={{ fontSize: 11, fill: "#6366f1" }} formatter={v => v > 0 ? v : ""} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 11 ── Aging Funnel / Horizontal bar (NEW) */
  const AgingChart = ({ height = 260 }) => {
    const data = (aging || []).map(b => ({ name: b.label, value: b.count, fill: b.color }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: "#475569" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Open Complaints" radius={[0,4,4,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <LabelList dataKey="value" position="right" style={LABEL_STYLE} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* 12 ── Customer Radar (NEW) */
  const CustomerRadarChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="customer" tick={{ fontSize: 12, fill: "#64748b" }} />
        <PolarRadiusAxis angle={30} tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Radar name="Complaints" dataKey="complaints" stroke={RADAR_COLOR} fill={RADAR_COLOR} fillOpacity={0.18} strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Tooltip content={<ChartTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );

  /* 13 ── Top Defects Pareto (NEW) */
  // const TopDefectsParetoChart = ({ height = 280 }) => (
  //   <ResponsiveContainer width="100%" height={height}>
  //     <ComposedChart data={topDefectsPareto} margin={{ top: 10, right: 30, bottom: 50, left: 0 }}>
  //       <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
  //       <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-35} textAnchor="end" interval={0} />
  //       <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} />
  //       <YAxis yAxisId="right" orientation="right" domain={[0, 100]}
  //         tick={{ fontSize: 12, fill: "#ef4444" }} tickFormatter={v => `${v}%`} />
  //       <Tooltip content={<ChartTooltip />} />
  //       <Legend wrapperStyle={{ fontSize: 13 }} />
  //       <Bar yAxisId="left" dataKey="value" name="Count" fill="#06b6d4" radius={[4,4,0,0]} />
  //       <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE}
  //         strokeWidth={2.5} dot={{ r: 4, fill: PARETO_LINE }} />
  //     </ComposedChart>
  //   </ResponsiveContainer>
  // );

  /* 14 ── Radial Bar — Customer Comparison (NEW) */
  const CustomerRadialChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart cx="50%" cy="50%" innerRadius="15%" outerRadius="90%"
        data={radialData} startAngle={180} endAngle={0}>
        <RadialBar minAngle={15} background clockWise dataKey="value" label={{ position: "insideStart", fill: "#fff", fontSize: 11 }} />
        <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip content={<ChartTooltip />} />
      </RadialBarChart>
    </ResponsiveContainer>
  );

  /* 15 ── Customer Bar (Top 10) (NEW) */
  const CustomerBarChart = ({ height = 280 }) => {
    const data = (byCustomer || []).slice(0, 10).map(c => ({ name: c._id || "Unknown", count: c.count, ppm: c.ppm || 0 }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="count" name="Complaints" fill="#3b82f6" radius={[4,4,0,0]}>
            <LabelList dataKey="count" position="top" style={LABEL_STYLE} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>

      {/* ── Filter Bar (original, unchanged) ── */}
      <FilterBar>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>
              Filters:
            </span>
          </div>
        <RangePicker
          className="pg-datepicker"
          onChange={setDateRange}
          style={{ borderRadius: 10, fontSize: 13 }}
          placeholder={["From date", "To date"]}
        />
        <Select
          className="pg-select"
          placeholder="All Customers"
          allowClear
          style={{ minWidth: 160 }}
          onChange={v => setCustomer(v || "")}
        >
          {["GODREJ","HAIER","AMSTRAD","ONIDA","MARQ","CROMA","VOLTAS","BLUE STAR","BPL","SAMSUNG","LG"].map(c =>
            <Option key={c}>{c}</Option>
          )}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}
          style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, borderColor: "#e2e8f0" }}>
          Refresh
        </Button>
      </FilterBar>

      {/* ── KPI Cards (original, unchanged) ── */}
      <Row gutter={[14, 14]}>
        {kpis.map(k => (
          <Col key={k.label} xs={24} sm={12} lg={Math.floor(24 / kpis.length)}>
            <KpiCard {...k} loading={statsLoading} />
          </Col>
        ))}
      </Row>

      {/* ════════════ ROW 1 — Monthly Trend + Status Donut + DOA Donut ════════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="Complaints Over Time (Monthly)" icon="📈"
            extra={
              <Space>
                <Tag color="blue" style={{ fontSize: 12, borderRadius: 8 }}>Last 12 months</Tag>
                {expandBtn("Complaints Over Time (Monthly)", <MonthlyLineChart height={380} />, "Monthly trend")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Complaints Over Time", <MonthlyLineChart height={380} />, "Monthly trend")}>
              {monthlyLoading ? <Loading /> : <MonthlyLineChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={7}>
          <SectionCard title="Status Distribution" icon="🍩"
            extra={expandBtn("Status Distribution", <StatusDonutChart height={380} />, "All statuses")}>
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Status Distribution", <StatusDonutChart height={380} />, "All statuses")}>
              {!byStatus ? <Loading /> : <StatusDonutChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={7}>
          <SectionCard title="DOA / IW / OOW Split" icon="🛡️"
            extra={expandBtn("DOA / IW / OOW", <DoaDonutChart height={380} />, "Warranty classification")}>
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("DOA / IW / OOW", <DoaDonutChart height={380} />, "Warranty classification")}>
              {doaLoading ? <Loading /> : <DoaDonutChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════════ ROW 2 — Daily Load + Area Trend + PPM Trend ════════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard title="Daily Complaint Load (Last 30 days)" icon="📅"
            extra={expandBtn("Daily Complaints", <DailyBarChart height={380} />, "Last 30 days")}>
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Daily Complaints", <DailyBarChart height={380} />, "Last 30 days")}>
              {dailyLoading ? <Loading /> : <DailyBarChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="Created vs Resolved Trend" icon="📊"
            extra={expandBtn("Created vs Resolved", <AreaTrendChart height={380} />, "Monthly comparison")}>
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Created vs Resolved Trend", <AreaTrendChart height={380} />, "Monthly comparison")}>
              {monthlyLoading ? <Loading /> : <AreaTrendChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="PPM Trend (Monthly)" icon="📉"
            extra={
              <Space>
                <Tag color="purple" style={{ fontSize: 12, borderRadius: 8 }}>Parts Per Million</Tag>
                {expandBtn("PPM Trend", <PpmTrendChart height={380} />, "Monthly PPM")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("PPM Trend", <PpmTrendChart height={380} />, "Monthly PPM")}>
              {ppmLoading ? <Loading /> : <PpmTrendChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════════ ROW 3 — Customer Bar + Customer Pareto + Radar ════════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard title="Complaints by Customer" icon="🏭"
            extra={
              <Space>
                <Tag color="blue" style={{ fontSize: 12, borderRadius: 8 }}>Top 10</Tag>
                {expandBtn("Complaints by Customer", <CustomerBarChart height={380} />, "Customer breakdown")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Complaints by Customer", <CustomerBarChart height={380} />, "Top 10 customers")}>
              {customerLoading ? <Loading /> : <CustomerBarChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="Customer Pareto Analysis" icon="📐"
            extra={
              <Space>
                <Tag color="volcano" style={{ fontSize: 12, borderRadius: 8 }}>80/20 Rule</Tag>
                {expandBtn("Customer Pareto", <CustomerParetoChart height={380} />, "Cumulative %")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Customer Pareto", <CustomerParetoChart height={380} />, "80/20 analysis")}>
              {customerLoading ? <Loading /> : <CustomerParetoChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="Customer Radar Profile" icon="🎯"
            extra={expandBtn("Customer Radar", <CustomerRadarChart height={380} />, "Multi-dimensional")}>
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Customer Radar Profile", <CustomerRadarChart height={380} />, "Complaint radar")}>
              {customerLoading ? <Loading /> : <CustomerRadarChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════════ ROW 4 — Category Pareto + Top Parts + Commodity ════════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard title="Defect Category Pareto" icon="🔬"
            extra={
              <Space>
                <Tag color="purple" style={{ fontSize: 12, borderRadius: 8 }}>80/20 Rule</Tag>
                {expandBtn("Category Pareto", <CategoryParetoChart height={380} />, "Category analysis")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Defect Category Pareto", <CategoryParetoChart height={380} />, "Category Pareto")}>
              {categoryLoading ? <Loading /> : <CategoryParetoChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="Top Defective Parts" icon="🔩"
            extra={
              <Space>
                <Tag color="orange" style={{ fontSize: 12, borderRadius: 8 }}>Top 10</Tag>
                {expandBtn("Top Defective Parts", <TopPartsChart height={380} />, "Part breakdown")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Top Defective Parts", <TopPartsChart height={380} />, "Horizontal bar")}>
              {partLoading ? <Loading /> : <TopPartsChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="Commodity Split (IDU / ODU)" icon="⚙️"
            extra={expandBtn("Commodity Split", <CommodityPieChart height={380} />, "IDU vs ODU")}>
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Commodity Split", <CommodityPieChart height={380} />, "IDU vs ODU")}>
              {commodityLoading ? <Loading /> : <CommodityPieChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════════ ROW 5 — Top Defects Pareto + Aging + Radial ════════════ */}
      <Row gutter={[16, 16]}>
        {/* <Col xs={24} lg={8}>
          <SectionCard title="Top Defects Pareto" icon="🏆"
            extra={
              <Space>
                <Tag color="cyan" style={{ fontSize: 12, borderRadius: 8 }}>Top Issues</Tag>
                {expandBtn("Top Defects Pareto", <TopDefectsParetoChart height={380} />, "Defect frequency")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Top Defects Pareto", <TopDefectsParetoChart height={380} />, "Pareto analysis")}>
              {topDefectsLoading ? <Loading /> : <TopDefectsParetoChart />}
            </div>
          </SectionCard>
        </Col> */}

        <Col xs={24} lg={8}>
          <SectionCard title="Open Complaint Aging" icon="⏰"
            extra={
              <Space>
                <Tag color="red" style={{ fontSize: 12, borderRadius: 8 }}>Unresolved</Tag>
                {expandBtn("Complaint Aging", <AgingChart height={380} />, "Age buckets")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Open Complaint Aging", <AgingChart height={380} />, "By age bucket")}>
              {agingLoading ? <Loading /> : <AgingChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard title="Top 6 Customers — Radial" icon="🌐"
            extra={
              <Space>
                <Tag color="geekblue" style={{ fontSize: 12, borderRadius: 8 }}>Radial View</Tag>
                {expandBtn("Customer Radial", <CustomerRadialChart height={380} />, "Radial comparison")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Customer Radial", <CustomerRadialChart height={380} />, "Radial bar")}>
              {customerLoading ? <Loading /> : <CustomerRadialChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ── Chart Preview Modal (original, unchanged) ── */}
      <ChartPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title}
        subtitle={preview?.subtitle}
      >
        {preview?.chart}
      </ChartPreviewModal>

    </div>
  );
}