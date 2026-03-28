// sections/OverviewSection.jsx
import React, { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";

//external libraries
import { Button, Tag, Space, Select, Tooltip } from "antd";
import { ExpandAltOutlined, PushpinOutlined, PushpinFilled } from "@ant-design/icons";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar } from "recharts";
import { ChartTooltip, Loading, CHART_COLORS, fmtNum } from "../components/shared";
import { MdDonutLarge, MdSettings, MdTrendingUp, MdBarChart, MdTrendingDown, MdBuild, MdCalendarToday, MdAccessTime, MdSearch, MdFactory, MdBolt } from "react-icons/md";
import { VscActivateBreakpoints } from "react-icons/vsc";
import { GiSpiderWeb } from "react-icons/gi";
import { TbWorldUp, TbBuildingFactory } from "react-icons/tb";
import { TfiBarChartAlt } from "react-icons/tfi";
import { RiShieldCheckLine, RiFileList3Line, RiAlarmWarningLine, RiCheckboxCircleLine, RiClockwiseLine, RiTimerLine, } from "react-icons/ri";

//custom HOOks
import { useBatchQuery } from "../components/useApiQuery";

//Internal Components
import ChartPreviewModal from "../components/ChartPreviewModal";


const { Option } = Select;

/* ── Palettes ── */
const STATUS_COLORS   = { Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8" };
const PARETO_LINE     = "#ef4444";
const RADAR_COLOR     = "#6366f1";
const RADIAL_COLORS   = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
const LABEL_S         = { fontSize: 10, fill: "#1e293b", fontWeight: 600 };

const SHADOW_STYLE = {
  filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0 1px 3px rgba(0,0,0,0.08))",
};

const CHART_CARD_STYLE = {
  borderRadius: 12,
  padding: "10px 4px 6px",
  marginBottom: 0,
  background: "transparent",
};

const CURRENT_YEAR = new Date().getFullYear();

/* ── Pareto builder ── */
function buildPareto(data, keyField = "_id", valueField = "count") {
  if (!data?.length) return [];
  const sorted = [...data].sort((a, b) => b[valueField] - a[valueField]).slice(0, 12);
  const total  = sorted.reduce((s, d) => s + (d[valueField] || 0), 0);
  let cum = 0;
  return sorted.map(d => {
    cum += d[valueField] || 0;
    return {
      name: d[keyField] || "Unknown",
      value: d[valueField] || 0,
      cumPct: total > 0 ? +((cum / total) * 100).toFixed(1) : 0,
    };
  });
}

/* ── Formatters ── */
const fmtMonth = v => {
  if (!v) return "";
  const [yr, mo] = v.split("-");
  return new Date(yr, mo - 1).toLocaleString("default", { month: "short", year: "2-digit" });
};


/* ── Custom 3D bar shapes ── */
const Shadow3DBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return null;
  const depth = 3;
  return (
    <g>
      <polygon points={`${x+width},${y} ${x+width+depth},${y-depth} ${x+width+depth},${y+height-depth} ${x+width},${y+height}`} fill={fill} opacity={0.4} />
      <polygon points={`${x},${y} ${x+width},${y} ${x+width+depth},${y-depth} ${x+depth},${y-depth}`} fill={fill} opacity={0.65} />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
    </g>
  );
};


/* ════════════════════════════════════════
   KPI CARD
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
        background: "#fff", border: `1px solid ${c.border}`, borderRadius: 9,
        padding: "8px 12px", height: 76,
        display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 3px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default", width: "100%", position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.11)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, background: c.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: c.accent, lineHeight: 1.1 }}>
          {loading ? <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span> : value}
        </div>
        {sub && <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{sub}</div>}
      </div>
      <button
        onClick={onPin}
        title={pinned ? "Unpin KPIs" : "Pin KPIs to top"}
        style={{
          position: "absolute", top: 5, right: 5,
          background: "none", border: "none", cursor: "pointer",
          color: pinned ? c.accent : "#cbd5e1", fontSize: 12, padding: 2,
          transition: "color 0.2s",
        }}
      >
        {pinned ? <PushpinFilled /> : <PushpinOutlined />}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════
   CHART CARD wrapper
════════════════════════════════════════ */
function ChartCard({ title, icon, tag, tagColor, loading: isLoading, onExpand, headerExtra, children, minHeight }) {
  return (
    <div className="card" style={{ ...CHART_CARD_STYLE, minHeight: minHeight || "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{title}</span>
          {tag && <Tag color={tagColor} style={{ fontSize: 9, borderRadius: 4, padding: "0 4px", margin: 0 }}>{tag}</Tag>}
        </div>
        <Space size={3}>
          {headerExtra}
          {onExpand && (
            <Button type="text" size="small" icon={<ExpandAltOutlined />}
              onClick={onExpand} style={{ color: "#3b82f6", fontSize: 11, padding: "0 2px" }} />
          )}
        </Space>
      </div>
      <div style={{
        borderRadius: 10,
        boxShadow: "0 4px 18px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
        padding: "8px 6px 6px",
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
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12
      }}
    >
      {(Array.isArray(children) ? children : [children])
        .filter(Boolean)
        .map((child, i) => (
          <div
            key={i}
            style={{
              flex: `1 1 calc(${100 / cols}% - 12px)`,
              minWidth: 320
            }}
          >
            {child}
          </div>
        ))}
    </div>
  );
}

/* ── Zero data message ── */
const ZeroData = ({ msg = "No data for selected year" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, color: "#94a3b8" }}>
    <span style={{ fontSize: 28, marginBottom: 6 }}>📭</span>
    <span style={{ fontSize: 11, fontWeight: 600 }}>{msg}</span>
  </div>
);

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function OverviewSection({ addToast,  }) {
  const [preview, setPreview]           = useState(null);
  const [kpiPinned, setKpiPinned]       = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [defectDropdown, setDefectDropdown] = useState("overall");
  const { filters} = useOutletContext() || {};

  /* Year-scoped filters */
  const yearFilters = useMemo(() => ({
    ...filters,
    from: `${filters.year}-01-01T00:00:00.000Z`,
    to:   `${filters.year}-12-31T23:59:59.999Z`,
  }), [filters]);

  const lastYearFilters = useMemo(() => ({
    ...filters,
    from: `${selectedYear - 1}-01-01T00:00:00.000Z`,
    to:   `${selectedYear - 1}-12-31T23:59:59.999Z`,
  }), [filters, selectedYear]);


  const { data, isLoading } = useBatchQuery([
    { key: "stats", url: "/complaints/stats", params: yearFilters },
    { key: "statsLY", url: "/complaints/stats", params: lastYearFilters },
    { key: "monthly", url: "/complaints/monthly", params: yearFilters },
    { key: "daily", url: "/complaints/daily", params: yearFilters },
    { key: "byStatus", url: "/complaints/by-status", params: yearFilters },
    { key: "byCustomer", url: "/complaints/by-customer", params: yearFilters },
    { key: "byCategory", url: "/complaints/by-category", params: yearFilters },
    { key: "byPart", url: "/complaints/by-part", params: yearFilters },
    { key: "byCommodity", url: "/complaints/by-commodity", params: yearFilters },
    { key: "byDoa", url: "/complaints/by-doa", params: yearFilters },
    { key: "ppmTrend", url: "/complaints/ppm-trend", params: yearFilters },
    { key: "aging", url: "/complaints/aging", params: yearFilters },
    { key: "production", url: "/complaints/production-stats", params: yearFilters },
    { key: "catVsCust", url: "/complaints/customer-vs-category", params: yearFilters },
  ]);

  const {
    stats,
    statsLY,
    monthly,
    daily,
    byStatus,
    byCustomer,
    byCategory,
    byPart,
    byCommodity,
    byDoa,
    ppmTrend,
    aging,
    production,
    catVsCust
  } = data || {};

  /* ── Memos ── */
  const statusData     = useMemo(() => (byStatus || []).map(s => ({ name: s._id, value: s.count })), [byStatus]);
  const statusTotal    = useMemo(() => statusData.reduce((s, d) => s + d.value, 0), [statusData]);
  const areaData       = useMemo(() => (monthly || []).map(m => ({ ...m, resolved: Math.round((m.defects || 0) * 0.7) })), [monthly]);
  const catParetoData  = useMemo(() => buildPareto(byCategory || [], "_id", "count"), [byCategory]);
  const commodityData  = useMemo(() => (byCommodity || []).map(c => ({ name: c._id || "Unknown", value: c.count })), [byCommodity]);

  /* DOA data — always show DOA / IW / OOW even if 0 */
  const DOA_KEYS = ["DOA", "IW", "OOW"];
  const DOA_COLOR_MAP = { DOA: "#ef4444", IW: "#f59e0b", OOW: "#3b82f6" };
  const doaData = useMemo(() => {
    const raw = byDoa || [];
    const lookup = Object.fromEntries(raw.map(d => [d._id, d.count]));
    return DOA_KEYS.map(key => ({ name: key, value: lookup[key] ?? 0 }));
  }, [byDoa]);

  const doaTotal = useMemo(() => doaData.reduce((s, d) => s + d.value, 0), [doaData]);

  const sortedCustomers = useMemo(() => [...(byCustomer || [])]
    .sort((a, b) => (b.complaints || 0) - (a.complaints || 0)),
    [byCustomer]
  );

  const radarData = useMemo(() => sortedCustomers.slice(0, 7).map(c => ({
    customer: (c.name || "Unknown").slice(0, 8),
    complaints: c.complaints || 0,
    ppm: c.ppm || 0,
  })), [sortedCustomers]);

  const radialData = useMemo(() => sortedCustomers.slice(0, 6).map((c, i) => ({
    name: c.name || "Unknown",
    value: c.complaints || 0,
    fill: RADIAL_COLORS[i],
  })), [sortedCustomers]);

  const allCategories = useMemo(() => {
    const cats = new Set();
    (catVsCust || []).forEach(row => Object.keys(row).filter(k => k !== "_id").forEach(k => cats.add(k)));
    return [...cats];
  }, [catVsCust]);

  const defectBrandData = useMemo(() => {
    if (!catVsCust) return [];
    const lookup = Object.fromEntries(catVsCust.map(r => [r._id, r]));
    return (byCustomer || []).slice(0, 12).map(cust => {
      const row = lookup[cust.name] || {};
      let val = 0;
      if (defectDropdown === "overall") {
        val = Object.entries(row).filter(([k]) => k !== "_id").reduce((s, [, v]) => s + (v || 0), 0);
      } else {
        val = row[defectDropdown] || 0;
      }
      return { name: cust.name || "Unknown", value: val };
    }).filter(d => d.value > 0);
  }, [catVsCust, byCustomer, defectDropdown]);

  const defectBrandTotal = useMemo(() => defectBrandData.reduce((s, d) => s + d.value, 0), [defectBrandData]);

  /* Pareto for defectBrand */
  const defectBrandPareto = useMemo(() => {
    const sorted = [...defectBrandData].sort((a, b) => b.value - a.value);
    const total  = sorted.reduce((s, d) => s + d.value, 0);
    let cum = 0;
    return sorted.map(d => {
      cum += d.value;
      return { ...d, cumPct: total > 0 ? +((cum / total) * 100).toFixed(1) : 0 };
    });
  }, [defectBrandData]);

  /* Pareto for customer */
  const customerParetoData = useMemo(() => {
    const sorted = [...(byCustomer || [])].sort((a, b) => (b.complaints || 0) - (a.complaints || 0)).slice(0, 10);
    const total  = sorted.reduce((s, c) => s + (c.complaints || 0), 0);
    let cum = 0;
    return sorted.map(c => {
      cum += c.complaints || 0;
      return { name: c.name || "Unknown", count: c.complaints || 0, cumPct: total > 0 ? +((cum / total) * 100).toFixed(1) : 0 };
    });
  }, [byCustomer]);

  /* Pareto for parts */
  const partsParetoData = useMemo(() => {
    const sorted = [...(byPart || [])].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 10);
    const total  = sorted.reduce((s, d) => s + (d.count || 0), 0);
    let cum = 0;
    return sorted.map(d => {
      cum += d.count || 0;
      return { name: d._id || "Unknown", count: d.count || 0, cumPct: total > 0 ? +((cum / total) * 100).toFixed(1) : 0 };
    });
  }, [byPart]);

  /* Pareto for daily */
  const dailyParetoData = useMemo(() => {
    const today = new Date();
    const filtered = (daily || []).filter(d => {
      const date = new Date(d.d);
      const diff = (today - date) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).sort((a, b) => (b.count || 0) - (a.count || 0));
    const total = filtered.reduce((s, d) => s + (d.count || 0), 0);
    let cum = 0;
    return filtered.map(d => {
      cum += d.count || 0;
      const [, m, day] = d.d.split("-");
      return { name: `${day}/${m}`, count: d.count || 0, cumPct: total > 0 ? +((cum / total) * 100).toFixed(1) : 0 };
    });
  }, [daily]);

  const agingTotal = useMemo(() => (aging || []).reduce((s, b) => s + (b.count || 0), 0), [aging]);
  const agingPct   = useMemo(() => (aging || []).map(b => ({
    ...b, pct: agingTotal > 0 ? +((b.count / agingTotal) * 100).toFixed(1) : 0,
  })), [aging, agingTotal]);

  const allDefectsDonut = useMemo(() => {
    const total = (byCategory || []).reduce((s, c) => s + c.count, 0);
    return (byCategory || []).map(c => ({
      name: c._id || "Unknown",
      value: c.count,
      pct: total > 0 ? +((c.count / total) * 100).toFixed(1) : 0,
    }));
  }, [byCategory]);

  const openPreview = (title, chartEl) => setPreview({ title, chart: chartEl });

  /* ──────────────── NEEDLE OVERLAY ──────────────── */
  function NeedleOverlay({ angleDeg, h, innerRadius }) {
    const toRad   = d => (d * Math.PI) / 180;
    const needleL = innerRadius - 6;
    const pivotR  = 6;
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
      <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
        <polygon points={`${tipX},${tipY} ${lx},${ly} ${rx},${ry}`} fill="#1e293b" opacity={0.88} />
        <line x1={cx} y1={cy} x2={tailX} y2={tailY} stroke="#1e293b" strokeWidth={2} opacity={0.45} />
        <circle cx={cx} cy={cy} r={pivotR}     fill="#1e293b" opacity={0.9} />
        <circle cx={cx} cy={cy} r={pivotR - 3} fill="#fff" />
      </svg>
    );
  }

  /* ──────────────── CHARTS ──────────────── */

  /* Monthly Volume */
  const MonthlyLine = ({ h = 190 }) => {
    const data = monthly || [];
    if (!data.length || data.every(d => !d.defects)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 4, left: 10 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
          <XAxis dataKey="m" axisLine={{ stroke: "#000" }} tick={{ fontSize: 10, fill: "#091413" }} tickFormatter={fmtMonth} />
          <YAxis tick={{ fontSize: 10, color: "#000" }} width={30} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "blue" }} />
          <Line type="monotone" dataKey="defects" name="Total Complaints" stroke="#e53935" strokeWidth={2}
            dot={{ r: 3, fill: "#e53935", filter: "drop-shadow(0 2px 3px rgba(229,57,53,0.5))" }}
            activeDot={{ r: 5 }}>
            <LabelList dataKey="defects" position="top" style={{ fontSize: 10, fill: "#1e293b", fontWeight: 600 }} formatter={v => v || ""} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  };

  /* Status Donut */
  const StatusDonut = ({ h = 200 }) => {
    if (!statusData.length || statusTotal === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart style={SHADOW_STYLE}>
          <Pie data={statusData} cx="50%" cy="50%" margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
            dataKey="value" nameKey="name" paddingAngle={10}
            label={({ name, value }) =>
              `${name.length > 10 ? name.slice(0, 10) + "..." : name}: ${
                statusTotal > 0 ? ((value / statusTotal) * 100).toFixed(1) : 0
              }%`
            }            
            labelLine={{ stroke: "#cbd5e1" }}>
            {statusData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || CHART_COLORS[i]} />)}
          </Pie>
          <ReTooltip content={<ChartTooltip />} formatter={(v, n) => [`${statusTotal > 0 ? ((v / statusTotal) * 100).toFixed(1) : 0}%`, n]} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /* DOA Half-Donut — always shows DOA/IW/OOW even if 0 */
  const DoaHalfDonut = ({ h = 200 }) => {
  const total = doaData.reduce((s, d) => s + d.value, 0);
  const [hov, setHov] = useState(null);
  const outerR = h > 300 ? 105 : 75;

  const sorted = [...doaData].sort((a, b) => b.value - a.value);

  return (
    <div style={{ position: "relative", width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height={h}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} style={SHADOW_STYLE}>
          <Pie
              data={sorted}
              cx="50%"
              cy="50%"        // ← back to centre (was 85% for half-donut)
              startAngle={190} // ← full circle, starting from top
              endAngle={-360} // ← going clockwise all the way around
              innerRadius={outerR * 0.58}
              // outerRadius={outerR}
              dataKey="value"
              nameKey="name"
              paddingAngle={13}
              paddingRightAngle={-13}
              onMouseEnter={(_, i) => setHov(i)}
              onMouseLeave={() => setHov(null)}
              
            >
            {sorted.map((d, i) => (
              <Cell
                key={i}
                fill={DOA_COLOR_MAP[d.name] || "#94a3b8"}
                opacity={hov === null || hov === i ? 1 : 0.3}
                style={{ transition: "opacity 0.18s", cursor: "pointer" }}
              />
            ))}
          </Pie>

          {/* Total count centred on the flat edge */}
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: h > 300 ? 22 : 16, fontWeight: 800, fill: "#1e293b" }}>
            {total}
          </text>
          <text x="50%" y="52%" textAnchor="middle"
            style={{ fontSize: 9, fill: "#64748b" }}>
            Total
          </text>

          <ReTooltip
            formatter={(v, n) => [
              `${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%  (${v})`, n,
            ]}
            contentStyle={{ borderRadius: 7, border: "none", background: "#1e293b", color: "#fff", fontSize: 11 }}
            itemStyle={{ color: "#fff" }}
            labelStyle={{ display: "none" }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value, entry) => (
              <span style={{ color: "#1e293b" }}>
                {value}: <strong style={{ color: entry.color }}>{entry.payload.value}</strong>
                {total > 0 && (
                  <span style={{ color: "#64748b" }}>
                    {" "}({((entry.payload.value / total) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

  /* Commodity Pie */
  const CommodityPie = ({ h = 200 }) => {
    const total = commodityData.reduce((s, d) => s + d.value, 0);
    if (!commodityData.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart style={SHADOW_STYLE}>
          <Pie data={commodityData} cx="44%" cy="48%"
            outerRadius={h > 300 ? 95 : 68}
            dataKey="value" nameKey="name" paddingAngle={3}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: "#cbd5e1" }}>
            {commodityData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /* Area Trend */
  const AreaTrend = ({ h = 190 }) => {
    if (!areaData.length || areaData.every(d => !d.defects)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart data={areaData}  margin={{ top: 14, right: 20, bottom: 4, left: 12 }}>
          <defs>
            <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e53935" stopOpacity={0.18}/><stop offset="95%" stopColor="#e53935" stopOpacity={0}/></linearGradient>
            <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.18}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#1e293b" }} angle={-10} tickFormatter={fmtMonth} />
          <YAxis tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Area type="monotone" dataKey="defects"  name="New Complaints"      stroke="#e53935" fill="url(#gC)" strokeWidth={2} />
          <Area type="monotone" dataKey="resolved" name="Resolved Complaints" stroke="#22c55e" fill="url(#gR)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  /* PPM Trend */
  const PpmTrend = ({ h = 190 }) => {
    if (!ppmTrend?.length || ppmTrend.every(d => !d.defects && !d.ppm)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={ppmTrend || []} margin={{ top: 18, right: 20, bottom: 4, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#1e293b" }} tickFormatter={fmtMonth} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: "#6366f1" }} width={44}
            label={{ angle: 0, position: "insideTopRight", dy: -4, style: { fontSize: 9, fill: "#6366f1" } }} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar yAxisId="l" dataKey="defects" name="Defect Volume" fill="#93c5fd" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#93c5fd" />} />
          <Line yAxisId="r" type="monotone" dataKey="ppm" name="PPM Rate" stroke="#6366f1" strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }}>
            <LabelList dataKey="ppm" position="top" style={{ fontSize: 9, fill: "#6366f1", fontWeight: 600 }} formatter={v => v > 0 ? v : ""} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* Daily Pareto */
  const DailyParetoChart = ({ h = 190 }) => {
    const hasData = dailyParetoData.some(d => d.count > 0);
    if (!dailyParetoData.length || !hasData) return <ZeroData />;
    const data = dailyParetoData;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={data} margin={{ top: 15, right: 10, bottom: 5, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 15, fill: "#1e293b" }} angle={-40} textAnchor="end" height={56} interval={Math.floor(data.length / 12)} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: PARETO_LINE }} width={36} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar yAxisId="l" dataKey="count" name="Complaints" fill="#3b82f6" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#3b82f6" />}>
            <LabelList dataKey="count" position="top" style={{ fontSize: 8, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2}
            dot={{ r: 2, fill: PARETO_LINE }} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* Category Pareto */
  const CategoryPareto = ({ h = 190 }) => {
    if (!catParetoData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={catParetoData} margin={{ top: 14, right: 10, bottom: 5, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 19, fill: "#1e293b" }} angle={-10} textAnchor="end" height={68} interval={0} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: PARETO_LINE }} width={36} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar yAxisId="l" dataKey="value" name="Defect Count" fill="#8b5cf6" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#8b5cf6" />}>
            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2}
            dot={{ r: 3, fill: PARETO_LINE }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* Customer Pareto */
  const CustomerParetoChart = ({ h = 240 }) => {
    if (!customerParetoData.length || customerParetoData.every(d => !d.count)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={customerParetoData} margin={{ top: 14, right: 10, bottom: 5, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#1e293b" }} angle={-35} textAnchor="end" height={62} interval={0} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: PARETO_LINE }} width={36} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar yAxisId="l" dataKey="count" name="Complaints" fill="#3b82f6" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#3b82f6" />}>
            <LabelList dataKey="count" position="top" style={{ fontSize: 9, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2}
            dot={{ r: 3, fill: PARETO_LINE }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* Parts Pareto */
  const PartsParetoChart = ({ h = 240 }) => {
    if (!partsParetoData.length || partsParetoData.every(d => !d.count)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={partsParetoData} margin={{ top: 14, right: 10, bottom: 5, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#1e293b" }} angle={-20} textAnchor="end" height={68} interval={0} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: PARETO_LINE }} width={36} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar yAxisId="l" dataKey="count" name="Complaints" fill="#f59e0b" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#f59e0b" />}>
            <LabelList dataKey="count" position="top" style={{ fontSize: 9, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2}
            dot={{ r: 3, fill: PARETO_LINE }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* Aging bar */
  const AgingChart = ({ h = 220 }) => {
    if (!agingPct.length || agingTotal === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={agingPct} margin={{ top: 20, right: 14, bottom: 14, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#1e293b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#1e293b" }} width={34} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <ReTooltip content={<ChartTooltip />} formatter={(v) => [`${v}%`, "Share"]} />
          <Bar dataKey="pct" name="% of Unresolved" radius={[3, 3, 0, 0]}
            label={{ position: "top", style: { fontSize: 10, fill: "#1e293b", fontWeight: 600 }, formatter: v => `${v}%` }}>
            {agingPct.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* Radar */
  const CustomerRadar = ({ h = 240 }) => {
    if (!radarData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="customer" tick={{ fontSize: 10, fill: "#1e293b" }} />
          <PolarRadiusAxis angle={30} tick={{ fontSize: 9, fill: "#1e293b" }} />
          <Radar name="Complaint Volume" dataKey="complaints" stroke={RADAR_COLOR} fill={RADAR_COLOR} fillOpacity={0.22} strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <ReTooltip content={<ChartTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  /* Radial */
const CustomerRadial = ({ h = 200, isPopup = false }) => {
  if (!radialData.length) return <ZeroData />;

  const innerR   = isPopup ? "40%" : "50%";
  const outerR   = isPopup ? "95%" : "98%";
  const cx       = isPopup ? "42%" : "40%";
  const cy       = isPopup ? "82%" : "78%";
  const legendFs = isPopup ? 11 : 9;
  const iconSz   = isPopup ? 9  : 7;

  return (
    <ResponsiveContainer width="100%" height={h}>
      <RadialBarChart
        cx={cx} cy={cy}
        startAngle={180} endAngle={0}
        innerRadius={innerR}
        outerRadius={outerR}
        data={radialData}
        barCategoryGap="35%"
        style={SHADOW_STYLE}
      >
        <RadialBar
          minAngle={4}
          background={{ fill: "#f1f5f9" }}
          clockWise
          dataKey="value"
          cornerRadius={5}
          label={false}          // ← no inline labels
        />

        <Legend
          iconType="circle"
          iconSize={iconSz}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{
            fontSize: legendFs,
            lineHeight: isPopup ? "22px" : "17px",
            right: 0,
            paddingRight: isPopup ? 8 : 4,
            maxWidth: isPopup ? 200 : 155,
            color: "#1e293b",
          }}
          formatter={(value, entry) => (
            <span style={{ color: "#1e293b", fontWeight: 400 }}>
              {value}
              {" "}
              <strong style={{ color: entry.color, fontWeight: 700 }}>
                {entry.payload.value}
              </strong>
            </span>
          )}
        />

        <ReTooltip content={<ChartTooltip />} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
};
  /* Defect Brand Pareto */
  const DefectBrandChart = ({ h = 240 }) => {
    if (!defectBrandPareto.length) return <ZeroData msg="No defect data for selection" />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={defectBrandPareto} margin={{ top: 14, right: 48, bottom: 5, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#1e293b" }} angle={-20} textAnchor="end" height={62} interval={0} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9, fill: PARETO_LINE }} width={36} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar yAxisId="l" dataKey="value" name="Defects" fill="#06b6d4" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#06b6d4" />}>
            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={PARETO_LINE} strokeWidth={2}
            dot={{ r: 3, fill: PARETO_LINE }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  /* All Defects Donut */
  const AllDefectsDonut = ({ h = 200 }) => {
    const total = allDefectsDonut.reduce((s, d) => s + d.value, 0);
    if (!allDefectsDonut.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart style={SHADOW_STYLE}>
          <Pie data={allDefectsDonut} cx="50%" cy="50%"
            innerRadius={h > 300 ? 62 : 48} outerRadius={h > 300 ? 100 : 72}
            dataKey="value" nameKey="name" paddingAngle={10}
            label={({ name, pct }) => `${name.length > 10 ? name.slice(0, 10) + "…" : name}: ${pct}%`}
            labelLine={{ stroke: "#cbd5e1" }}>
            {allDefectsDonut.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <ReTooltip content={<ChartTooltip />} formatter={(v, n, p) => [`${p?.payload?.pct ?? 0}%`, n]} />
          <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: 8,        // 👈 smaller text
                paddingTop: 4,
                lineHeight: "10px", // 👈 reduce row height
              }}
            />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /* YoY Compare */
  const YoYCompare = () => {
    const pairs = [
      { label: "Total",    curr: stats?.total    || 0, prev: statsLY?.total    || 0 },
      { label: "Open",     curr: stats?.open     || 0, prev: statsLY?.open     || 0 },
      { label: "Resolved", curr: stats?.resolved || 0, prev: statsLY?.resolved || 0 },
      { label: "Pending",  curr: stats?.pending  || 0, prev: statsLY?.pending  || 0 },
    ];
    const chartData = pairs.map(p => ({ name: p.label, [selectedYear]: p.curr, [selectedYear - 1]: p.prev }));
    return (
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={chartData} margin={{ top: 18, right: 14, bottom: 6, left:15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#1e293b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#1e293b" }} width={30} />
          <ReTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, color: "#1e293b" }} />
          <Bar dataKey={String(selectedYear - 1)} name={`${selectedYear - 1}`} fill="#cbd5e1" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#cbd5e1" />}>
            <LabelList position="top" style={{ fontSize: 9, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
          <Bar dataKey={String(selectedYear)} name={`${selectedYear}`} fill="#3b82f6" radius={[3, 3, 0, 0]} shape={<Shadow3DBar fill="#3b82f6" />}>
            <LabelList position="top" style={{ fontSize: 9, fill: "#1e293b", fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /* ── KPI DATA — icons colored to match chart theme ── */
  const kpis = [
    { label: "Total Complaints",  value: fmtNum(stats?.total    || 0), color: "blue",   icon: <RiFileList3Line color="#3b82f6" />, sub: `Year ${selectedYear}` },
    { label: "Open",              value: fmtNum(stats?.open     || 0), color: "red",    icon: <RiAlarmWarningLine color="#e53935" />, sub: "Needs attention" },
    { label: "Resolved",          value: fmtNum(stats?.resolved || 0), color: "green",  icon: <RiCheckboxCircleLine color="#16a34a" />, sub: "Closed successfully" },
    { label: "Pending",           value: fmtNum(stats?.pending  || 0), color: "amber",  icon: <RiClockwiseLine color="#d97706" />, sub: "Awaiting action" },
    { label: "Avg Resolution",    value: `${stats?.avgDays || 0}d`,    color: "purple", icon: <RiTimerLine color="#7c3aed" />,  sub: "Days to close" },
    { label: "Total Production",  value: fmtNum(production?.total || 0), color: "indigo", icon: <TbBuildingFactory color="#4f46e5" />, sub: "Units dispatched" },
  ];

  /* Defect dropdown */
  const defectOptions = useMemo(() => [
    { value: "overall", label: "All Defect Types" },
    ...allCategories.map(c => ({ value: c, label: c })),
  ], [allCategories]);
  
  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 60 }}>

      {/* ── KPI Strip ── */}
      <div style={{
        position: kpiPinned ? "sticky" : "relative", top: kpiPinned ? 50 : "auto", zIndex: 90,
        background: kpiPinned ? "rgba(245,246,250,0.96)" : "transparent",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e8ecf0",
        padding: "6px 0",
        marginBottom: 2,
      }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {kpis.map(k => (
            <div key={k.label} style={{ flex: "1 1 120px", minWidth: 120 }}>
              <MiniKpiCard {...k} loading={isLoading} pinned={kpiPinned} onPin={() => setKpiPinned(p => !p)} />
            </div>
          ))}
        </div>
      </div>

      {/* ROW A — 3 donut/pie charts */}
      <Grid cols={4}  >
        <ChartCard title="Complaint Status Share"
          icon={<MdDonutLarge size={15} color="#3b82f6" />}
          onExpand={() => openPreview("Complaint Status Share", <StatusDonut h={400} />)}>
          <StatusDonut h={200} />
        </ChartCard>

        <ChartCard title="Warranty Type: DOA / IW / OOW"
          icon={<RiShieldCheckLine size={15} color="#ef4444" />}
          loading={isLoading}
          onExpand={() => openPreview("Warranty Classification", <DoaHalfDonut h={420} />)}>
          <DoaHalfDonut h={200} />
        </ChartCard>

        <ChartCard title="Product Type Split (IDU vs ODU)"
          icon={<MdSettings size={15} color="#f59e0b" />}
          loading={isLoading}
          onExpand={() => openPreview("Product Type Split", <CommodityPie h={380} />)}>
          <CommodityPie h={200} />
        </ChartCard>

          <ChartCard title="Top 6 Brands — Complaint Share"
            icon={<TbWorldUp size={15} color="#22c55e" />}
            tag="Radial" tagColor="geekblue" loading={isLoading}
            onExpand={() => openPreview("Top 6 Brand Share", <CustomerRadial h={380} />)}>
            <CustomerRadial />
          </ChartCard>

      </Grid>

      {/* ROW B — 2 trend charts */}
      <Grid cols={3}>
        <ChartCard title="Monthly Complaint Trend"
          icon={<MdTrendingUp size={15} color="#e53935" />}
          tag={`${selectedYear}`} tagColor="blue" loading={isLoading}
          onExpand={() => openPreview("Monthly Complaint Trend", <MonthlyLine h={380} />)}>
          <MonthlyLine />
        </ChartCard>
        
        <ChartCard title={`${selectedYear} vs ${selectedYear - 1} Comparison`}
          icon={<MdBarChart size={15} color="#3b82f6" />}
          tag="YoY" tagColor="geekblue" loading={isLoading}
          onExpand={() => openPreview("Year-over-Year Comparison", <YoYCompare h={380} />)}>
          <YoYCompare />
        </ChartCard>

        <ChartCard title="New vs Resolved Complaints (Monthly)"
          icon={<VscActivateBreakpoints size={15} color="#22c55e" />}
          loading={isLoading}
          onExpand={() => openPreview("New vs Resolved", <AreaTrend h={380} />)}>
          <AreaTrend />
        </ChartCard>

      </Grid>

     

      {/* ROW D — 2 Pareto charts */}
      <Grid cols={3}>

        <ChartCard title="Monthly Quality Index (PPM)"
          icon={<MdBolt size={15} color="#6366f1" />}
          tag="PPM" tagColor="purple" loading={isLoading}
          onExpand={() => openPreview("Monthly Quality Index (PPM)", <PpmTrend h={380} />)}>
          <PpmTrend />
        </ChartCard>

        <ChartCard title="Day-by-Day Complaint Load — Pareto (Last 30 Days)"
          icon={<MdCalendarToday size={15} color="#3b82f6" />}
          loading={isLoading}
          onExpand={() => openPreview("Daily Complaint Pareto", <DailyParetoChart h={380} />)}>
          <DailyParetoChart />
        </ChartCard>

        <ChartCard title="Top Defect Categories — 80/20 Priority View"
          icon={<MdSearch size={15} color="#8b5cf6" />}
          tag="80/20" tagColor="purple" loading={isLoading}
          onExpand={() => openPreview("Defect Category Pareto", <CategoryPareto h={420} />)}>
          <CategoryPareto />
        </ChartCard>

      </Grid>

      {/* ROW E — 2 bar/pareto charts */}
      <Grid cols={3}>
        <ChartCard title="Top Brands by Complaint Volume"
          icon={<MdFactory size={15} color="#3b82f6" />}
          tag="Top 10" tagColor="blue" loading={isLoading}
          onExpand={() => openPreview("Top Brands by Complaint Volume", <CustomerParetoChart h={400} />)}>
          <CustomerParetoChart />
        </ChartCard>

        <ChartCard title="Brand Complaint Spread Overview"
          icon={<GiSpiderWeb size={15} color="#6366f1" />}
          loading={isLoading}
          onExpand={() => openPreview("Brand Radar", <CustomerRadar h={380} />)}>
          <CustomerRadar />
        </ChartCard>

        <ChartCard title="Most Reported Defective Parts (Top 10)"
          icon={<MdBuild size={15} color="#f59e0b" />}
          tag="Top 10" tagColor="orange" loading={isLoading}
          onExpand={() => openPreview("Most Reported Parts", <PartsParetoChart h={400} />)}>
          <PartsParetoChart />
        </ChartCard>
      </Grid>


      {/* ROW G — aging + defect donut + all defects donut = 3 donuts/charts */}
      <Grid cols={3}>
        <ChartCard title="Complaint Age Breakdown"
          icon={<MdAccessTime size={15} color="#ef4444" />}
          tag="Overdue %" tagColor="red" loading={isLoading}
          onExpand={() => openPreview("Complaint Age Breakdown", <AgingChart h={340} />)}>
          <AgingChart h={200} />
        </ChartCard>

        <ChartCard title="Defect Distribution Across Brands"
          icon={<TfiBarChartAlt size={15} color="#06b6d4" />}
          tag="Brand-wise" tagColor="cyan"
          headerExtra={
            <Select size="small" value={defectDropdown} onChange={setDefectDropdown}
              style={{ minWidth: 120, fontSize: 10 }} dropdownMatchSelectWidth={false}>
              {defectOptions.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
          }
          loading={isLoading}
          onExpand={() => openPreview("Defect Distribution Across Brands", <DefectBrandChart h={380} />)}>
          <DefectBrandChart h={200} />
        </ChartCard>

        <ChartCard title="All Defect Types — Category Breakdown"
          icon={<span style={{ fontSize: 14 }}>🧩</span>}
          tag="Donut" tagColor="purple" loading={isLoading}
          onExpand={() => openPreview("All Defect Types", <AllDefectsDonut h={380} />)}>
          <AllDefectsDonut h={200} />
        </ChartCard>

      </Grid>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}