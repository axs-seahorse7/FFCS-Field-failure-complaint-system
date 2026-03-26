// sections/OverviewSection.jsx
import React, { useState, useMemo, useCallback } from "react";
import { Button, Tag, Space, Select, Tooltip } from "antd";
import { ExpandAltOutlined, PushpinOutlined, PushpinFilled } from "@ant-design/icons";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, LabelList,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar, } from "recharts";
import {
  SectionCard, ChartTooltip, Loading, CHART_COLORS, fmtNum,
} from "../components/shared";
// import { useApi } from "../components/useApi";
import { useApiQuery } from "../components/useApiQuery";
import ChartPreviewModal from "../components/ChartPreviewModal";
import { MdDonutLarge, MdSettings , MdTrendingUp, MdBarChart, MdTrendingDown, MdBuild, MdCalendarToday, MdAccessTime, MdSearch, MdFactory, MdBolt } from "react-icons/md";
import { VscActivateBreakpoints } from "react-icons/vsc";
import { GiSpiderWeb } from "react-icons/gi";
import { TbWorldUp, TbBuildingFactory  } from "react-icons/tb";
import { TfiBarChartAlt } from "react-icons/tfi";



import { RiShieldCheckLine, RiFileList3Line, RiAlarmWarningLine, RiCheckboxCircleLine, RiClockwiseLine, RiTimerLine,  } from "react-icons/ri";


const { Option } = Select;

/* ── Palettes ── */
const STATUS_COLORS = { Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8" };
const PARETO_LINE   = "#ef4444";
const RADAR_COLOR   = "#6366f1";
const RADIAL_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
const LABEL_S       = { fontSize: 10, fill: "#475569", fontWeight: 500 };

/* ── Shadow styles for 3D effect ── */
const SHADOW_STYLE = {
  filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.18)) drop-shadow(0 1px 3px rgba(0,0,0,0.10))",
};

/* ── Chart card style — no background, just shadow on chart ── */
const CHART_CARD_STYLE = {
  borderRadius: 14,
  padding: "12px 4px 8px",
  marginBottom: 0,
  background: "transparent",
};

/* ── Year options ── */
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

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
const pctFmt = v => `${v}%`;

/* ── Chart margin presets ── */
const M_STD  = { top: 16, right: 24, bottom: 8, left: 4 };
const M_VERT = { top: 16, right: 56, bottom: 8, left: 8 };

/* ── Custom 3D bar shape ── */
const Shadow3DBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return null;
  const depth = 4;
  return (
    <g>
      {/* Shadow/depth face */}
      <polygon
        points={`${x+width},${y} ${x+width+depth},${y-depth} ${x+width+depth},${y+height-depth} ${x+width},${y+height}`}
        fill={fill}
        opacity={0.45}
      />
      {/* Top face */}
      <polygon
        points={`${x},${y} ${x+width},${y} ${x+width+depth},${y-depth} ${x+depth},${y-depth}`}
        fill={fill}
        opacity={0.7}
      />
      {/* Front face */}
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
    </g>
  );
};

/* ── Custom 3D horizontal bar shape ── */
const Shadow3DHBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (!width || width <= 0) return null;
  const depth = 3;
  return (
    <g>
      <polygon
        points={`${x+width},${y} ${x+width+depth},${y-depth} ${x+width+depth},${y+height-depth} ${x+width},${y+height}`}
        fill={fill} opacity={0.4}
      />
      <polygon
        points={`${x},${y} ${x+width},${y} ${x+width+depth},${y-depth} ${x+depth},${y-depth}`}
        fill={fill} opacity={0.65}
      />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
    </g>
  );
};

/* ════════════════════════════════════════
   KPI CARD — with pin support
════════════════════════════════════════ */
function MiniKpiCard({ label, value, sub, icon, color, loading, pinned, onPin }) {
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
        boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default", width: "100%", position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = ""; }}
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
      <button
        onClick={onPin}
        title={pinned ? "Unpin KPIs" : "Pin KPIs to top"}
        style={{
          position: "absolute", top: 6, right: 6,
          background: "none", border: "none", cursor: "pointer",
          color: pinned ? c.accent : "#cbd5e1", fontSize: 13, padding: 2,
          transition: "color 0.2s",
        }}
      >
        {pinned ? <PushpinFilled /> : <PushpinOutlined />}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════
   CHART CARD wrapper — no background, shadow on chart
════════════════════════════════════════ */
function ChartCard({ title, icon, tag, tagColor, loading: isLoading, onExpand, headerExtra, children, minHeight }) {
  return (
    <div className="card" style={{ ...CHART_CARD_STYLE, minHeight: minHeight || "auto" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 8px 8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{title}</span>
          {tag && <Tag color={tagColor} style={{ fontSize: 10, borderRadius: 5, padding: "0 5px", margin: 0 }}>{tag}</Tag>}
        </div>
        <Space size={4}>
          {headerExtra}
          {onExpand && (
            <Button type="text" size="medium"  icon={<ExpandAltOutlined />}
              onClick={onExpand} style={{ color: "blue", fontSize: 12, padding: "0 3px" }} />
          )}
        </Space>
      </div>
      <div style={{
        borderRadius: 12,
        boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        padding: "10px 8px 8px",
        background: "#fff",
      }}>
        {isLoading ? <Loading /> : children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   FLEXIBLE GRID
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

/* ── Zero data message ── */
const ZeroData = ({ msg = "No data for selected year" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 140, color: "#94a3b8" }}>
    <span style={{ fontSize: 32, marginBottom: 8 }}>📭</span>
    <span style={{ fontSize: 12, fontWeight: 600 }}>{msg}</span>
  </div>
);

/* ── Percentage label formatter ── */
function pctLabel(data, field = "value") {
  const total = (data || []).reduce((s, d) => s + (d[field] || 0), 0);
  return (value) => total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "";
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function OverviewSection({ addToast, filterDate, filters = {} }) {
  const [preview, setPreview]           = useState(null);
  const [kpiPinned, setKpiPinned]       = useState(false);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [defectDropdown, setDefectDropdown] = useState("overall"); // "overall" | customer name

  /* Year-scoped filters */
  const yearFilters = useMemo(() => ({
    ...filters,
    from: `${filterDate}-01-01T00:00:00.000Z`,
    to:   `${filterDate}-12-31T23:59:59.999Z`,
  }), [filters, filterDate]);

  const lastYearFilters = useMemo(() => ({
    ...filters,
    from: `${selectedYear - 1}-01-01T00:00:00.000Z`,
    to:   `${selectedYear - 1}-12-31T23:59:59.999Z`,
  }), [filters, selectedYear]);

  const { data: stats,       loading: statsL   } = useApiQuery("/complaints/stats",             yearFilters);
  const { data: statsLY,     loading: statsLYL  } = useApiQuery("/complaints/stats",             lastYearFilters);
  const { data: monthly,     loading: monthlyL  } = useApiQuery("/complaints/monthly",           yearFilters);
  const { data: daily,       loading: dailyL    } = useApiQuery("/complaints/daily",             yearFilters);
  const { data: byStatus                         } = useApiQuery("/complaints/by-status",        yearFilters);
  const { data: byCustomer,  loading: custL      } = useApiQuery("/complaints/by-customer",      yearFilters);
  const { data: byCategory,  loading: catL       } = useApiQuery("/complaints/by-category",      yearFilters);
  const { data: byPart,      loading: partL      } = useApiQuery("/complaints/by-part",          yearFilters);
  const { data: byCommodity, loading: commL      } = useApiQuery("/complaints/by-commodity",     yearFilters);
  const { data: byDoa,       loading: doaL       } = useApiQuery("/complaints/by-doa",           yearFilters);
  const { data: ppmTrend,    loading: ppmL       } = useApiQuery("/complaints/ppm-trend",        yearFilters);
  const { data: aging,       loading: agingL     } = useApiQuery("/complaints/aging",            yearFilters);
  const { data: production,  loading: prodL      } = useApiQuery("/complaints/production-stats", yearFilters);
  const { data: catVsCust                         } = useApiQuery("/complaints/customer-vs-category", yearFilters);

  console.log("by customer:", byCustomer);
  console.log("cat vs cust:", catVsCust);

  /* ── Memos ── */
  const statusData     = useMemo(() => (byStatus || []).map(s => ({ name: s._id, value: s.count })), [byStatus]);
  const statusTotal    = useMemo(() => statusData.reduce((s, d) => s + d.value, 0), [statusData]);
  const areaData       = useMemo(() => (monthly || []).map(m => ({ ...m, resolved: Math.round((m.defects || 0) * 0.7) })), [monthly]);
  const catParetoData  = useMemo(() => buildPareto(byCategory || [], "_id", "count"), [byCategory]);
  const commodityData  = useMemo(() => (byCommodity || []).map(c => ({ name: c._id || "Unknown", value: c.count })), [byCommodity]);
  const doaData        = useMemo(() => (byDoa || []).map(d => ({ name: d._id || "Unknown", value: d.count })), [byDoa]);
  const doaTotal       = useMemo(() => doaData.reduce((s, d) => s + d.value, 0), [doaData]);

  const sortedCustomers = useMemo(() => [...(byCustomer || [])]
  .sort((a, b) => (b.complaints || 0) - (a.complaints || 0)),
    [byCustomer]
  );
  const radarData = useMemo(() => sortedCustomers.slice(0, 7).map(c => ({
      customer: (c.name || "Unknown").slice(0, 8),
      complaints: c.complaints || 0,
      ppm: c.ppm || 0,
    })),
    [sortedCustomers]
  );

  const radialData = useMemo(() => sortedCustomers.slice(0, 6).map((c, i) => ({
        name: c.name || "Unknown",
        value: c.complaints || 0,
        fill: RADIAL_COLORS[i],
      })),
    [sortedCustomers]
  );
  /* ── Year vs last year comparison ── */
  const yoyData = useMemo(() => {
    const curr = stats?.total || 0;
    const prev = statsLY?.total || 0;
    const delta = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : curr > 0 ? "∞" : "0";
    const pctOpen    = curr > 0 ? ((stats?.open    || 0) / curr * 100).toFixed(1) : 0;
    const pctResolved= curr > 0 ? ((stats?.resolved|| 0) / curr * 100).toFixed(1) : 0;
    return { curr, prev, delta, pctOpen, pctResolved };
  }, [stats, statsLY]);

  /* ── Defect by brand (customer vs category) ── */
  const allCategories = useMemo(() => {
    const cats = new Set();
    (catVsCust || []).forEach(row => Object.keys(row).filter(k => k !== "_id").forEach(k => cats.add(k)));
    return [...cats];
  }, [catVsCust]);

  const customerNames = useMemo(() => (byCustomer || []).map(c => c._id), [byCustomer]);

  /* defect brand chart data */
 const defectBrandData = useMemo(() => {
  if (!catVsCust) return [];

  //  Convert to lookup map (O(1) access)
  const lookup = Object.fromEntries(
    catVsCust.map(r => [r._id, r])
  );

  return (byCustomer || [])
    .slice(0, 12)
    .map(cust => {
      const row = lookup[cust.name] || {};

      let val = 0;

      if (defectDropdown === "overall") {
        val = Object.entries(row)
          .filter(([k]) => k !== "_id")
          .reduce((s, [, v]) => s + (v || 0), 0);
      } else {
        val = row[defectDropdown] || 0;
      }

      return {
        name: cust.name || "Unknown",
        value: val,
      };
    })
    .filter(d => d.value > 0);
}, [catVsCust, byCustomer, defectDropdown]);

  const defectBrandTotal = useMemo(() => defectBrandData.reduce((s, d) => s + d.value, 0), [defectBrandData]);

  /* ── Aging with % ── */
  const agingTotal = useMemo(() => (aging || []).reduce((s, b) => s + (b.count || 0), 0), [aging]);
  const agingPct   = useMemo(() => (aging || []).map(b => ({
    ...b, pct: agingTotal > 0 ? +((b.count / agingTotal) * 100).toFixed(1) : 0,
  })), [aging, agingTotal]);

  /* ── All defects donut ── */
  const allDefectsDonut = useMemo(() => {
    const total = (byCategory || []).reduce((s, c) => s + c.count, 0);
    return (byCategory || []).map(c => ({
      name: c._id || "Unknown",
      value: c.count,
      pct: total > 0 ? +((c.count / total) * 100).toFixed(1) : 0,
    }));
  }, [byCategory]);

  const openPreview = (title, chartEl) => setPreview({ title, chart: chartEl });

  /* ──────────────── CHARTS ──────────────── */

  /* Monthly Volume */
  const MonthlyLine = ({ h = 220 }) => {
    const data = monthly || [];
    if (!data.length || data.every(d => !d.defects)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={data} margin={M_STD}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtMonth} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="defects" name="Total Complaints" stroke="#e53935" strokeWidth={2.5}
            dot={{ r: 4, fill: "#e53935", filter: "drop-shadow(0 2px 4px rgba(229,57,53,0.5))" }}
            activeDot={{ r: 6 }}
          >
            <LabelList dataKey="defects" position="top" style={LABEL_S} formatter={v => v || ""} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  };

  /* Status Donut — percentage */
  const StatusDonut = ({ h = 220 }) => {
    if (!statusData.length || statusTotal === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart style={SHADOW_STYLE}>
          <Pie data={statusData} cx="45%" cy="50%"
            innerRadius={h > 300 ? 70 : 55} outerRadius={h > 300 ? 100 : 80}
            dataKey="value" nameKey="name" paddingAngle={3}
            label={({ name, value }) => `${name}: ${statusTotal > 0 ? ((value/statusTotal)*100).toFixed(1) : 0}%`}
            labelLine={{ stroke: "#e2e8f0" }}>
            {statusData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || CHART_COLORS[i]} />)}
          </Pie>
          <ReTooltip content={<ChartTooltip />} formatter={(v, n) => [`${statusTotal > 0 ? ((v/statusTotal)*100).toFixed(1) : 0}%`, n]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };



const DOA_COLORS = { DOA: "#ef4444", IW: "#f59e0b", OOW: "#3b82f6" };

/* ── Needle SVG overlay — sits on top of the Recharts PieChart ── */
function NeedleOverlay({ angleDeg, h, innerRadius }) {
  const toRad  = d => (d * Math.PI) / 180;
  const needleL = innerRadius - 8;
  const pivotR  = 7;

  /* viewBox is 100 × h so cx=50 means 50% and cy=h*0.8 means 80% — 
     matching PieChart cx="50%" cy="80%" exactly */
  const W  = 100;
  const cx = 50;
  const cy = h * 0.8;

  const tipX = cx + needleL * Math.cos(toRad(angleDeg));
  const tipY = cy - needleL * Math.sin(toRad(angleDeg));
  const lx   = cx + pivotR  * Math.cos(toRad(angleDeg + 90));
  const ly   = cy - pivotR  * Math.sin(toRad(angleDeg + 90));
  const rx   = cx + pivotR  * Math.cos(toRad(angleDeg - 90));
  const ry   = cy - pivotR  * Math.sin(toRad(angleDeg - 90));
  const tailX = cx + (needleL * 0.18) * Math.cos(toRad(angleDeg + 180));
  const tailY = cy - (needleL * 0.18) * Math.sin(toRad(angleDeg + 180));

  return (
    <svg
      viewBox={`0 0 ${W} ${h}`}
      width="100%" height={h}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      {/* needle body */}
      <polygon
        points={`${tipX},${tipY} ${lx},${ly} ${rx},${ry}`}
        fill="#1e293b" opacity={0.88}
      />
      {/* short tail */}
      <line x1={cx} y1={cy} x2={tailX} y2={tailY}
        stroke="#1e293b" strokeWidth={2} opacity={0.45} />
      {/* pivot outer */}
      <circle cx={cx} cy={cy} r={pivotR}     fill="#1e293b" opacity={0.9} />
      {/* pivot inner white dot */}
      <circle cx={cx} cy={cy} r={pivotR - 3} fill="#fff" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   DoaHalfDonut  — half-donut gauge with needle
   Uses doaData / doaTotal from outer scope (same as original).
   Same props: { h }
════════════════════════════════════════════════════════════════ */
/* ── Needle SVG overlay ── */
function NeedleOverlay({ angleDeg, h, innerRadius }) {
  const toRad   = d => (d * Math.PI) / 180;
  const needleL = innerRadius - 8;
  const pivotR  = 7;
  const W  = 100;
  const cx = 50;
  const cy = h * 0.8;

  const tipX  = cx + needleL * Math.cos(toRad(angleDeg));
  const tipY  = cy - needleL * Math.sin(toRad(angleDeg));
  const lx    = cx + pivotR  * Math.cos(toRad(angleDeg + 90));
  const ly    = cy - pivotR  * Math.sin(toRad(angleDeg + 90));
  const rx    = cx + pivotR  * Math.cos(toRad(angleDeg - 90));
  const ry    = cy - pivotR  * Math.sin(toRad(angleDeg - 90));
  const tailX = cx + (needleL * 0.18) * Math.cos(toRad(angleDeg + 180));
  const tailY = cy - (needleL * 0.18) * Math.sin(toRad(angleDeg + 180));

  return (
    <svg
      viewBox={`0 0 ${W} ${h}`}
      width="100%" height={h}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <polygon
        points={`${tipX},${tipY} ${lx},${ly} ${rx},${ry}`}
        fill="#1e293b" opacity={0.88}
      />
      <line x1={cx} y1={cy} x2={tailX} y2={tailY}
        stroke="#1e293b" strokeWidth={2} opacity={0.45} />
      <circle cx={cx} cy={cy} r={pivotR}     fill="#1e293b" opacity={0.9} />
      <circle cx={cx} cy={cy} r={pivotR - 3} fill="#fff" />
    </svg>
  );
}

const DoaHalfDonut = ({ h = 250 }) => {
  const data  = doaData || [];
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hov, setHov] = useState(null);

  if (!data.length || total === 0) return <ZeroData />;

  const outerR = h > 300 ? 115 : 85;
  const innerR = h > 300 ? 70  : 52;

  const DOA_COLOR = { DOA: "#ef4444", IW: "#f59e0b", OOW: "#3b82f6" };

  /* ── Sort descending so Recharts draws largest segment first (leftmost) ── */
  const sorted = [...data].sort((a, b) => b.value - a.value);

  /* ── Compute each segment's start/end fraction in draw order ── */
  let cum = 0;
  const segMeta = sorted.map(d => {
    const frac  = total > 0 ? d.value / total : 0;
    const start = cum;
    const end   = cum + frac;
    const mid   = (start + end) / 2;   // midpoint fraction 0..1
    cum += frac;
    return { name: d.name, value: d.value, frac, mid };
  });

  /* ── Largest segment is always first after sort ── */
  const largestMid = segMeta[0]?.mid ?? 0.5;

  /* ── Convert fraction → SVG angle
       Recharts: startAngle=180 (left) endAngle=0 (right)
       fraction 0 → angle 180°, fraction 1 → angle 0°
       So: angle = 180 - fraction * 180                    ── */
  const needleAngle = 180 - largestMid * 180;

  return (
    <div style={{ position: "relative", width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height={h}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} style={SHADOW_STYLE} >
          <Pie
            data={sorted}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={innerR}
            outerRadius={outerR}
            dataKey="value"
            nameKey="name"
            paddingAngle={3}
            onMouseEnter={(_, i) => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            {sorted.map((d, i) => (
              <Cell
                key={i}
                fill={DOA_COLOR[d.name] || "#94a3b8"}
                opacity={hov === null || hov === i ? 1 : 0.3}
                style={{ transition: "opacity 0.18s", cursor: "pointer" }}
              />
            ))}
          </Pie>

          <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: h > 300 ? 26 : 20, fontWeight: 800, fill: "#1e293b" }}>
            {total}
          </text>
          <text x="50%" y="76%" textAnchor="middle"
            style={{ fontSize: 10, fill: "#94a3b8" }}>
            Total
          </text>

          <Tooltip
            formatter={(v, n) => [`${((v / total) * 100).toFixed(1)}%  (${v})`, n]}
            contentStyle={{ borderRadius: 8, border: "none", background: "#1e293b", color: "#fff", fontSize: 12 }}
            itemStyle={{ color: "#fff" }}
            labelStyle={{ display: "none" }}
          />
          <Legend
            iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 2, Shadow3DBar: "0 4px 12px rgba(0,0,0,0.1)", Shadow3DHBar: "0 4px 12px rgba(0,0,0,0.2)" }}
            formatter={(value, entry) => (
              <span style={{ color: "#475569" }}>
                {value}: <strong style={{ color: entry.color }}>{entry.payload.value}</strong>
                <span style={{ color: "#94a3b8" }}> ({((entry.payload.value / total) * 100).toFixed(1)}%)</span>
              </span>
            )}
          />
        </PieChart > 
      </ResponsiveContainer>

      <NeedleOverlay angleDeg={needleAngle} h={h} innerRadius={innerR} />
    </div>
  );
};

  /* Daily Bar — vertical, values shown */
const DailyBar = ({ h = 340 }) => {
const today = new Date();

const data = (daily || []).filter(d => {
  const date = new Date(d.d);
  const diff = (today - date) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
});

  const hasData = data.some(d => d.count > 0);
  if (!data.length || !hasData) return <ZeroData />;

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data}>
        <XAxis dataKey="d" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

  /* New vs Resolved */
  const AreaTrend = ({ h = 220 }) => {
    if (!areaData.length || areaData.every(d => !d.defects)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart data={areaData} margin={M_STD}>
          <defs>
            <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e53935" stopOpacity={0.18}/><stop offset="95%" stopColor="#e53935" stopOpacity={0}/></linearGradient>
            <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.18}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtMonth} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="defects"  name="New Complaints"      stroke="#e53935" fill="url(#gC)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="resolved" name="Resolved Complaints" stroke="#22c55e" fill="url(#gR)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  /* PPM Trend */
  const PpmTrend = ({ h = 220 }) => {
    if (!ppmTrend?.length || ppmTrend.every(d => !d.defects && !d.ppm)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={ppmTrend || []} margin={{ top: 16, right: 52, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={fmtMonth} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "#6366f1" }} width={46}
            label={{ value: "PPM →", angle: 0, position: "insideTopRight", dy: -4, style: { fontSize: 9, fill: "#6366f1" } }} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="l" dataKey="defects" name="Defect Volume" fill="#93c5fd" radius={[4, 4, 0, 0]} shape={<Shadow3DBar fill="#93c5fd" />} />
          <Line yAxisId="r" type="monotone" dataKey="ppm" name="PPM Rate" stroke="#6366f1" strokeWidth={2.5}
            dot={{ r: 4, fill: "#6366f1", filter: "drop-shadow(0 2px 4px rgba(99,102,241,0.5))" }} activeDot={{ r: 6 }}>
            <LabelList dataKey="ppm" position="top" style={{ fontSize: 9, fill: "#6366f1" }} formatter={v => v > 0 ? v : ""} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* Top Customers — vertical bar */
  const CustomerBar = ({ h = 280 }) => {
  const data = (byCustomer || [])
    .sort((a, b) => (b.complaints || 0) - (a.complaints || 0))
    .slice(0, 10)
    .map(c => ({
      name: c.name || "Unknown",
      count: c.complaints || 0
    }));

  if (!data.length || data.every(d => !d.count)) return <ZeroData />;

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} margin={{ top: 20, right: 16, bottom: 60, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#475569" }}
          angle={-35}
          textAnchor="end"
          height={64}
          interval={0}
        />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
        <ReTooltip content={<ChartTooltip />} />
        <Bar
          dataKey="count"
          name="Complaints"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          shape={<Shadow3DBar fill="#3b82f6" />}
        >
          <LabelList dataKey="count" position="top" style={LABEL_S} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

  /* Category Pareto — vertical */
  const CategoryPareto = ({ h=400 }) => {
    const cnt = catParetoData.length;
    const chartH = h || Math.max(320, cnt * 38 + 80);
    if (!catParetoData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={catParetoData} margin={{ top: 40, right: 56, bottom: 70, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} angle={-40} textAnchor="end" height={72} interval={0} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`}
            tick={{ fontSize: 9, fill: "#ef4444" }} width={38} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="l" dataKey="value" name="Defect Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} shape={<Shadow3DBar fill="#8b5cf6" />}>
            <LabelList dataKey="value" position="top" style={LABEL_S} />
          </Bar>

          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2.5}
            dot={{ r: 4, fill: PARETO_LINE, filter: "drop-shadow(0 2px 4px rgba(239,68,68,0.5))" }} style={{ strokeWidth: 2 }} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* Top Parts — vertical */
  const TopParts = ({ h }) => {
    const data = (byPart || []).slice(0, 10).map(d => ({ name: d._id || "Unknown", count: d.count }));
    const chartH = h || Math.max(300, data.length * 32 + 100);
    if (!data.length || data.every(d => !d.count)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={data} margin={{ top: 20, right: 16, bottom: 70, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} angle={-40} textAnchor="end" height={72} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <ReTooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaints" fill="#f59e0b" radius={[4, 4, 0, 0]} shape={<Shadow3DBar fill="#f59e0b" />}>
            <LabelList dataKey="count" position="top" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* Commodity Pie */
  const CommodityPie = ({ h = 220 }) => {
    const total = commodityData.reduce((s, d) => s + d.value, 0);
    if (!commodityData.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart style={SHADOW_STYLE}>
          <Pie data={commodityData} cx="50%" cy="48%"
            outerRadius={h > 300 ? 105 : 72}
            dataKey="value" nameKey="name" paddingAngle={4}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#e2e8f0" }}>
            {commodityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /* Aging — vertical bar with % */
  const AgingChart = ({ h = 260 }) => {
    if (!agingPct.length || agingTotal === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={agingPct} margin={{ top: 24, right: 16, bottom: 16, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={36} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <ReTooltip content={<ChartTooltip />} formatter={(v) => [`${v}%`, "Share"]} />
          <Bar dataKey="pct" name="% of Unresolved" radius={[4, 4, 0, 0]} label={{ position: "top", style: { fontSize: 10, fill: "#475569", fontWeight: 600 }, formatter: v => `${v}%` }}>
            {agingPct.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* Radar */
  const CustomerRadar = ({ h = 280 }) => {
    if (!radarData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="customer" tick={{ fontSize: 10, fill: "#64748b" }} />
          <PolarRadiusAxis angle={30} tick={{ fontSize: 9, fill: "#94a3b8" }} />
          <Radar name="Complaint Volume" dataKey="complaints" stroke={RADAR_COLOR} fill={RADAR_COLOR} fillOpacity={0.22} strokeWidth={2.5} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReTooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  /* Radial — bigger, no clip */
  const CustomerRadial = ({ h = 240 }) => {
    if (!radialData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <RadialBarChart cx="45%" cy="70%" innerRadius="20%" outerRadius="90%"
          data={radialData} startAngle={180} endAngle={0}>
          <RadialBar minAngle={15} background clockWise dataKey="value"
            label={{ position: "insideStart", fill: "#fff", fontSize: 9, fontWeight: 700 }} />
          <Legend iconSize={9} layout="vertical" verticalAlign="middle" align="right"
            wrapperStyle={{ fontSize: 10, right: 0, paddingRight: 4, maxWidth: 210, overflow: "hidden" }} />
          <ReTooltip content={<ChartTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>
    );
  };

  /* Defect by Brand (vertical bar, percentage) */
  const DefectBrandChart = ({ h = 280 }) => {

    if (!defectBrandData.length || defectBrandTotal === 0) return <ZeroData msg="No defect data for selection" />;
    const withPct = defectBrandData.map(d => ({ ...d, pct: +((d.value / defectBrandTotal) * 100).toFixed(1) }));

    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={withPct} margin={{ top: 24, right: 16, bottom: 60, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} angle={-35} textAnchor="end" height={64} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={36} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <ReTooltip content={<ChartTooltip />} formatter={v => [`${v}%`, "Share"]} />
          <Bar dataKey="pct" name="% of Defects" fill="#06b6d4" radius={[4, 4, 0, 0]} shape={<Shadow3DBar fill="#06b6d4" />}>
            <LabelList dataKey="pct" position="top" style={{ fontSize: 9, fill: "#475569", fontWeight: 600 }} formatter={v => `${v}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* All Defect Types Donut */
  const AllDefectsDonut = ({ h = 240 }) => {
    const total = allDefectsDonut.reduce((s, d) => s + d.value, 0);
    if (!allDefectsDonut.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart style={SHADOW_STYLE}>
          <Pie data={allDefectsDonut} cx="45%" cy="50%"
            innerRadius={h > 300 ? 65 : 52} outerRadius={h > 300 ? 110 : 80}
            dataKey="value" nameKey="name" paddingAngle={3}
            label={({ name, pct }) => `${name.length > 10 ? name.slice(0,10)+"…" : name}: ${pct}%`}
            labelLine={{ stroke: "#e2e8f0" }}>
            {allDefectsDonut.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <ReTooltip content={<ChartTooltip />} formatter={(v, n, p) => [`${p?.payload?.pct?? 0}%`, n]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /* ── YoY comparison ── */
  const YoYCompare = () => {
    const curr = stats?.total || 0;
    const prev = statsLY?.total || 0;
    const isUp = curr > prev;
    const delta = prev > 0 ? Math.abs(((curr - prev) / prev) * 100).toFixed(1) : curr > 0 ? "∞" : "0";
    const pairs = [
      { label: "Total", curr: stats?.total || 0, prev: statsLY?.total || 0, color: "#3b82f6" },
      { label: "Open",  curr: stats?.open  || 0, prev: statsLY?.open  || 0, color: "#e53935" },
      { label: "Resolved", curr: stats?.resolved || 0, prev: statsLY?.resolved || 0, color: "#22c55e" },
      { label: "Pending",  curr: stats?.pending  || 0, prev: statsLY?.pending  || 0, color: "#f59e0b" },
    ];
    const chartData = pairs.map(p => ({ name: p.label, [selectedYear]: p.curr, [selectedYear - 1]: p.prev }));
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 20, right: 16, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey={String(selectedYear - 1)} name={`${selectedYear - 1}`} fill="#cbd5e1" radius={[4, 4, 0, 0]} shape={<Shadow3DBar fill="#cbd5e1" />}>
            <LabelList position="top" style={LABEL_S} />
          </Bar>
          <Bar dataKey={String(selectedYear)} name={`${selectedYear}`} fill="#3b82f6" radius={[4, 4, 0, 0]} shape={<Shadow3DBar fill="#3b82f6" />}>
            <LabelList position="top" style={LABEL_S} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ── KPI DATA ── */
  const kpis = [
    { label: "Total Complaints",  value: fmtNum(stats?.total    || 0), color: "blue",   icon: <RiFileList3Line color="blue" />, sub: `Year ${selectedYear}` },
    { label: "Open",              value: fmtNum(stats?.open     || 0), color: "red",    icon: <RiAlarmWarningLine color="red" />, sub: "Needs attention" },
    { label: "Resolved",          value: fmtNum(stats?.resolved || 0), color: "green",  icon: <RiCheckboxCircleLine color="green" />, sub: "Closed successfully" },
    { label: "Pending",           value: fmtNum(stats?.pending  || 0), color: "amber",  icon: <RiClockwiseLine color="orange" />, sub: "Awaiting action" },
    { label: "Avg Resolution",    value: `${stats?.avgDays || 0}d`,    color: "purple", icon: <RiTimerLine color="purple" />,  sub: "Days to close" },
    { label: "Total Production",  value: fmtNum(production?.total || 0), color: "indigo", icon: <TbBuildingFactory color="indigo" />, sub: "Units dispatched" },
  ];

  /* ── Defect dropdown options ── */
  const defectOptions = useMemo(() => [
    { value: "overall", label: "All Defect Types" },
    ...allCategories.map(c => ({ value: c, label: c })),
  ], [allCategories]);

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
   
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 80 }}>

      {/* ── Pinned KPI strip (sticky) ── */}
        <div style={{
          position: kpiPinned ? "sticky" : "relative", top:kpiPinned ? 50 : "auto", zIndex: 90,
          background: kpiPinned ? "rgba(245,246,250,0.96)" : "transparent",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e8ecf0",
          padding: "8px 0 8px",
          marginBottom: 4,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {kpis.map(k => (
              <div key={k.label} style={{ flex: "1 1 130px", minWidth: 130 }}>
                <MiniKpiCard {...k} loading={statsL || prodL} pinned={kpiPinned} onPin={() => setKpiPinned(p => !p)} />
              </div>
            ))}
          </div>
        </div>
      

      {/* ROW A — 3 pie/donut charts */}
      <Grid cols={3}>
        <ChartCard title="Complaint Status Share" icon={(<MdDonutLarge size={18} />)} 
          onExpand={() => openPreview("Complaint Status Share", <StatusDonut h={450} />)}>
          <StatusDonut h={250} />
        </ChartCard>
        <ChartCard title="Warranty Type: DOA / IW / OOW" icon={(<RiShieldCheckLine size={18} />)} loading={doaL}
          onExpand={() => openPreview("Warranty Classification", <DoaHalfDonut h={450} doaData={doaData} doaTotal={doaTotal} ZeroData={ZeroData} />)}>
          <DoaHalfDonut h={250} doaData={doaData} doaTotal={doaTotal} ZeroData={ZeroData} />
        </ChartCard>
        <ChartCard title="Product Type Split (IDU vs ODU)" icon={(<MdSettings size={18} />)} loading={commL}
          onExpand={() => openPreview("Product Type Split", <CommodityPie h={400} />)}>
          <CommodityPie h={250} />
        </ChartCard>
      </Grid>

      {/* ROW B — Monthly + Year vs Year */}
      <Grid cols={2}>
        <ChartCard title="Monthly Complaint Trend" icon={(<MdTrendingUp size={18} />)} tag={`${selectedYear}`} tagColor="blue" loading={monthlyL}
          onExpand={() => openPreview("Monthly Complaint Trend", <MonthlyLine h={400} />)}>
          <MonthlyLine />
        </ChartCard>
        <ChartCard title={`${selectedYear} vs ${selectedYear - 1} Comparison`} icon={(<MdBarChart size={18} />)} tag="YoY" tagColor="geekblue" loading={statsL || statsLYL}>
          <YoYCompare />
        </ChartCard>
      </Grid>

      {/* ROW C — New vs Resolved + PPM */}
      <Grid cols={2}>
        <ChartCard title="New vs Resolved Complaints (Monthly)" icon={(<VscActivateBreakpoints size={18} />)} loading={monthlyL}
          onExpand={() => openPreview("New vs Resolved", <AreaTrend h={400} />)}>
          <AreaTrend />
        </ChartCard>
        <ChartCard title="Monthly Quality Index (PPM)" icon={(<MdBolt size={18} />)} tag="Parts Per Million" tagColor="purple" loading={ppmL}
          onExpand={() => openPreview("Monthly Quality Index (PPM)", <PpmTrend h={400} />)}>
          <PpmTrend />
        </ChartCard>
      </Grid>

      {/* ROW D — Daily bar (full width for better spacing) */}
      <ChartCard title="Day-by-Day Complaint Load (Last 30 Days)" icon={(<MdCalendarToday size={18} />)} loading={dailyL}
        onExpand={() => openPreview("Daily Complaint Load", <DailyBar h={400} />)}>
        <DailyBar />
      </ChartCard>

      {/* ROW E — Defect category pareto (full width, more space) */}
      <ChartCard title="Top Defect Categories — 80/20 Priority View" icon={(<MdSearch size={18} />)} tag="80/20 Rule" tagColor="purple" loading={catL}
        onExpand={() => openPreview("Defect Category Pareto", <CategoryPareto h={500} />)}>
        <CategoryPareto />
      </ChartCard>

      {/* ROW F — Top customers (vertical) + Radar */}
      <Grid cols={2}>
        <ChartCard title="Top Brands by Complaint Volume" icon={(<MdFactory size={18} />)} tag="Top 10" tagColor="blue" loading={custL}
          onExpand={() => openPreview("Top Brands by Complaint Volume", <CustomerBar h={400} />)}>
          <CustomerBar />
        </ChartCard>
        <ChartCard title="Brand Complaint Spread Overview" icon={(<GiSpiderWeb size={18}  />)} loading={custL}
          onExpand={() => openPreview("Brand Radar", <CustomerRadar h={400} />)}>
          <CustomerRadar />
        </ChartCard>
      </Grid>

      {/* ROW G — Top parts (vertical, full width) */}
      <ChartCard title="Most Reported Defective Parts (Top 10)" icon={(<MdBuild size={18}  />)} tag="Top 10" tagColor="orange" loading={partL}
        onExpand={() => openPreview("Most Reported Parts", <TopParts h={500} />)}>
        <TopParts />
      </ChartCard>

      {/* ROW H — Aging (vertical %) + Radial */}
      <Grid cols={2}>
        <ChartCard title="How Long Complaints Stay Unresolved" icon={(<MdAccessTime size={18} />)} tag="Overdue %" tagColor="red" loading={agingL}
          onExpand={() => openPreview("Complaint Age Breakdown", <AgingChart h={340} />)}>
          <AgingChart />
        </ChartCard>
        <ChartCard title="Top 6 Brands — Complaint Share" icon={(<TbWorldUp size={18} />)} tag="Radial" tagColor="geekblue" loading={custL}
          onExpand={() => openPreview("Top 6 Brand Share", <CustomerRadial h={340} />)}>
          <CustomerRadial h={280} />
        </ChartCard>
      </Grid>

      {/* ROW I — Defect by Brand chart + All Defects Donut */}
      <Grid cols={2}>
        <ChartCard
          title="Defect Distribution Across Brands"
          icon={(<TfiBarChartAlt size={18} />)}
          tag="Brand-wise"
          tagColor="cyan"
          headerExtra={
            <Select
              size="small"
              value={defectDropdown}
              onChange={setDefectDropdown}
              style={{ minWidth: 140, fontSize: 11 }}
              dropdownMatchSelectWidth={false}
            >
              {defectOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
          }
          loading={!catVsCust}
          onExpand={() => openPreview("Defect Distribution Across Brands", <DefectBrandChart h={400} />)}
        >
          <DefectBrandChart />
        </ChartCard>
        <ChartCard title="All Defect Types — Category Breakdown" icon="🧩" tag="Donut" tagColor="purple" loading={catL}
          onExpand={() => openPreview("All Defect Types", <AllDefectsDonut h={400} />)}>
          <AllDefectsDonut />
        </ChartCard>
      </Grid>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}