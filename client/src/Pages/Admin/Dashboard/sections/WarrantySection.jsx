// sections/WarrantySection.jsx
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Tag, Button, Space } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { ChartTooltip, Loading, CHART_COLORS, fmtNum } from "../components/shared";
import { useApiQuery, useBatchQuery } from "../components/useApiQuery";
import ChartPreviewModal from "../components/ChartPreviewModal";

/* ── Design tokens ── */
const CHART_SHADOW = {
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  padding: "10px 8px 8px",
  background: "#fff",
};
const LABEL_S  = { fontSize: 10, fill: "#475569", fontWeight: 600 };
const DOA_COLORS = { DOA: "#e53935", IW: "#f59e0b", OOW: "#3b82f6" };
const RADIAN   = Math.PI / 180;

/* ── 3D bar shape ── */
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
          <Button type="text" size="small" icon={<ExpandAltOutlined />} onClick={onExpand}
            style={{ color: "#cbd5e1", fontSize: 12, padding: "0 3px" }} />
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

const ZeroData = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 140, color: "#94a3b8" }}>
    <span style={{ fontSize: 32, marginBottom: 8 }}>📭</span>
    <span style={{ fontSize: 12, fontWeight: 600 }}>No data available</span>
  </div>
);

/* ── Pie label ── */
const renderDoaLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
  if (percent < 0.05) return null;
  const r = outerRadius + 24;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${name}: ${fmtNum(value)} (${(percent*100).toFixed(0)}%)`}
    </text>
  );
};

export default function WarrantySection() {
  const [preview, setPreview] = useState(null);
  const {filters} = useOutletContext();

  const { data, isLoading } = useBatchQuery([
    { key: "doaData", url: "/complaints/by-doa", params: { year: filters.year } },
    { key: "ppmTrend", url: "/complaints/ppm-trend", params: { year: filters.year } },
    { key: "byCommodity", url: "/complaints/by-commodity", params: { year: filters.year } },
    { key: "commVsCat", url: "/complaints/commodity-vs-category", params: { year: filters.year } },
    { key: "byReplacement", url: "/complaints/by-replacement", params: { year: filters.year } },
    { key: "stats", url: "/complaints/stats", params: { year: filters.year } },
  ]);

  const {
    doaData = [],
    ppmTrend = [],
    byCommodity = [],
    commVsCat = [],
    byReplacement = [],
    stats = {}
  } = data || {};

  const commSorted = [...(byCommodity || [])].sort((a, b) => b.count - a.count);
  const doaPieData = [...(doaData || [])].sort((a, b) => b.count - a.count);
  const replSorted = [...(byReplacement || [])].sort((a, b) => b.count - a.count);

  const openPreview = (title, chart) => setPreview({ title, chart });

  /* ── KPI cards ── */
  const kpis = [
    { label: "Avg PPM",       value: fmtNum(stats?.avgPpm  || 0), color: "#ef4444", bg: "#fff1f0", border: "#fecaca", icon: "📈", sub: ` ${new Date().getFullYear() === filters.year ? '' : 'Previous '}Year (${filters.year})` },
    { label: "CY 2023 PPM",   value: fmtNum(stats?.ppm2023 || 0), color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", icon: "📅", sub: `Calendar ${filters.year}` },
    { label: "CY 2024 PPM",   value: fmtNum(stats?.ppm2024 || 0), color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "📅", sub: `Calendar ${filters.year}` },
    { label: "DOA Count",     value: fmtNum(doaData?.find(d => d._id === "DOA")?.count || 0), color: "#dc2626", bg: "#fff1f0", border: "#fecaca", icon: "⚠️", sub: "Dead on Arrival" },
  ];

  /* ── Charts ── */

  const DoaDonut = ({ h = 320 }) => {
    const total = doaPieData.reduce((s, d) => s + d.count, 0);
    if (!doaPieData.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie data={doaPieData} cx="45%" cy="48%"
            innerRadius={h > 400 ? 85 : 62} outerRadius={h > 400 ? 130 : 95}
            dataKey="count" nameKey="_id" paddingAngle={4}
            label={renderDoaLabel} labelLine={false}>
            {doaPieData.map((d, i) => <Cell key={i} fill={DOA_COLORS[d._id] || CHART_COLORS[i]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} formatter={fmtNum} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const PpmLine = ({ h = 320 }) => {
    const data = ppmTrend || [];
    if (!data.length || data.every(d => !d.ppm)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={36} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="ppm" name="PPM Rate" stroke="#e53935" strokeWidth={2.5}
            dot={{ r: 4, fill: "#e53935", filter: "drop-shadow(0 2px 4px rgba(229,57,53,0.5))" }}
            activeDot={{ r: 6 }}>
            <LabelList dataKey="ppm" position="top" style={LABEL_S} formatter={fmtNum} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const CommodityBar = ({ h = 220 }) => {
    if (!commSorted.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={commSorted} margin={{ top: 24, right: 16, bottom: 16, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaints" radius={[4,4,0,0]}>
            <Cell fill="#3b82f6" />
            <Cell fill="#8b5cf6" />
            <LabelList dataKey="count" position="top" style={LABEL_S} formatter={fmtNum} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const CommVsCatStacked = ({ h = 220 }) => {
    if (!commVsCat) return <ZeroData />;
    const cats = ["ELEC PART DEFECTS","PART BROKEN / DAMAGED / MISSING","LEAK","NOISE","MISC DEFECT"];
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={commVsCat || []} margin={{ top: 20, right: 10, bottom: 16, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {cats.map((cat, i) => (
            <Bar key={cat} dataKey={cat} name={cat.split(" ")[0]} stackId="a" fill={CHART_COLORS[i]}>
              <LabelList dataKey={cat} position="center" style={{ fontSize: 10, fill: "#fff", fontWeight: 700 }} formatter={v => v > 5 ? v : ""} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const ReplacementBar = ({ h = 220 }) => {
    if (!replSorted.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={replSorted} margin={{ top: 24, right: 16, bottom: 16, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#475569" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Count" radius={[4,4,0,0]}>
            {replSorted.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
            <LabelList dataKey="count" position="top" style={LABEL_S} formatter={fmtNum} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 80 }}>

      {/* ── KPI strip ── */}
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

      {/* Row 1 — DOA Donut + PPM Line */}
      <Grid cols={2}>
        <ChartCard title="Warranty Type — DOA vs In-Warranty vs Out-of-Warranty" icon="🛡️" loading={isLoading}
          onExpand={() => openPreview("Warranty Type Breakdown", <DoaDonut h={420} />)}>
          <DoaDonut />
        </ChartCard>
        <ChartCard title="Monthly Quality Rate (Parts Per Million)" icon="📈" tag="PPM Trend" tagColor="red" loading={isLoading}
          onExpand={() => openPreview("Monthly PPM Trend", <PpmLine h={420} />)}>
          <PpmLine />
        </ChartCard>
      </Grid>

      {/* Row 2 — Commodity bar + Comm vs Cat + Replacement */}
      <Grid cols={3}>
        <ChartCard title="IDU vs ODU Complaint Volume" icon="📦" loading={isLoading}
          onExpand={() => openPreview("IDU vs ODU Split", <CommodityBar h={360} />)}>
          <CommodityBar />
        </ChartCard>
        <ChartCard title="Defect Types in IDU vs ODU Units" icon="📊" tag="Stacked" tagColor="blue"
          loading={!commVsCat} onExpand={() => openPreview("Defects in IDU vs ODU", <CommVsCatStacked h={360} />)}>
          <CommVsCatStacked />
        </ChartCard>
        <ChartCard title="Type of Replacement Issued" icon="🔄" loading={isLoading}
          onExpand={() => openPreview("Replacement Type Breakdown", <ReplacementBar h={360} />)}>
          <ReplacementBar />
        </ChartCard>
      </Grid>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}