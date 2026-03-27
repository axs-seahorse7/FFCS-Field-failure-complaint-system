// sections/DefectsSection.jsx
import { useState, useMemo } from "react";
import { Select, Button, Space, Tag } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import { useOutletContext } from "react-router-dom";
import {BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap, } from "recharts";
import { ChartTooltip, Loading, FilterBar, CHART_COLORS, fmtNum } from "../components/shared";
import { useBatchQuery } from "../components/useApiQuery";
import ChartPreviewModal from "../components/ChartPreviewModal";
import LoaderPage from "../../../../Components/Skeleto-Loader/LoaderPage";


const { Option } = Select;

/* ── Shared design tokens ── */
const CHART_SHADOW = {
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
  padding: "10px 8px 8px",
  background: "#fff",
};
const LABEL_S = { fontSize: 10, fill: "#475569", fontWeight: 600 };
const RADIAN  = Math.PI / 180;
const PARTS_LIST = ["IDU PCB","ODU PCB","DISPLAY PCB","REMOTE","IDU MOTOR","ODU MOTOR","SWING MOTOR","COMPRESSOR","EVAPORATOR COIL","CONDENSER COIL"];

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
function ChartCard({ title, icon, tag, tagColor, loading: isLoading, onExpand, headerExtra, children }) {
  return (
    <div className="card" style={{ borderRadius: 14, padding: "12px 4px 8px", background: "transparent" }}>
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
              style={{ color: "blue", fontSize: 15, padding: "0 3px" }} />
          )}
        </Space>
      </div>
      <div style={CHART_SHADOW}>
        {isLoading ? <Loading /> : children}
      </div>
    </div>
  );
}

/* ── Grid ── */
function Grid({ cols = 3, children }) {
  const pct = `calc(${100 / cols}% - ${((cols - 1) * 12) / cols}px)`;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {(Array.isArray(children) ? children : [children]).filter(Boolean).map((child, i) => (
        <div key={i} style={{ flex: `0 0 ${pct}`, minWidth: 260, boxSizing: "border-box" }}>{child}</div>
      ))}
    </div>
  );
}

/* ── Zero state ── */
const ZeroData = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 140, color: "#94a3b8" }}>
    <span style={{ fontSize: 32, marginBottom: 8 }}>📭</span>
    <span style={{ fontSize: 12, fontWeight: 600 }}>No data available</span>
  </div>
);

/* ── Pie label ── */
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  const r = outerRadius + 22;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return percent > 0.04 ? (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central" fontSize={11} fontWeight={500}>
      {`${(name || "").split(" ")[0]} ${(percent * 100).toFixed(1)}%`}
    </text>
  ) : null;
};

/* ── Treemap custom content ── */
const TreemapContent = ({ x, y, width, height, name, value, index }) => {
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x+2} y={y+2} width={width-4} height={height-4}
        style={{ fill: CHART_COLORS[index % CHART_COLORS.length], stroke: "#fff", strokeWidth: 2, opacity: 0.88 }} rx={4} />
      {width > 60 && height > 30 && (
        <text x={x+width/2} y={y+height/2-6} textAnchor="middle" fill="#fff" fontSize={Math.min(12, width/8)} fontWeight={600}>
          {(name || "").slice(0, 14)}
        </text>
      )}
      {width > 60 && height > 44 && (
        <text x={x+width/2} y={y+height/2+10} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={11}>{value}</text>
      )}
    </g>
  );
};

export default function DefectsSection() {
  const [customer, setCustomer] = useState("");
  const [preview,  setPreview]  = useState(null);
  const {filters} = useOutletContext();

  const params = useMemo(() => {
    const p = {};
    if (customer) p.customerName = customer; // reuse this
    if (filters.year) p.year = filters.year;
    return p;
  }, [customer, filters.year]);

  const { data, isLoading } = useBatchQuery([
    { key: "byCategory", url: "/complaints/by-category", params },
    { key: "byPart", url: "/complaints/by-part", params },
    { key: "topDefects", url: "/complaints/top-defects", params },
    { key: "catVsPart", url: "/complaints/category-vs-part", params },
    { key: "monthly", url: "/complaints/monthly", params },
    { key: "custVsCategory", url: "/complaints/customer-vs-category", params },
    { key: "commodityVsCat", url: "/complaints/commodity-vs-category", params },
    { key: "byCommodity", url: "/complaints/by-commodity", params },
    ]);

  const {
    byCategory = [],
    byPart = [],
    topDefects = [],
    catVsPart = [],
    monthly = [],
    custVsCategory = [],
    commodityVsCat = [],
    byCommodity = []
  } = data || {};



  const sortedParts    = useMemo(() => (byPart     || []).sort((a, b) => b.count - a.count).slice(0, 12), [byPart]);
  const sortedDefects  = useMemo(() => (topDefects || []).sort((a, b) => b.count - a.count).slice(0, 10), [topDefects]);
  const sortedCategory = useMemo(() => (byCategory || []).sort((a, b) => b.count - a.count), [byCategory]);

  const paretoData = useMemo(() => {
    const total = sortedDefects.reduce((s, d) => s + d.count, 0);
    let cum = 0;
    return sortedDefects.map(d => {
      cum += d.count;
      return { ...d, name: (d._id || d.name || "").slice(0, 22), cumm: +((cum / total) * 100).toFixed(1) };
    });
  }, [sortedDefects]);

  const treemapData        = useMemo(() => (sortedCategory || []).map(d => ({ name: d._id || "Unknown", size: d.count, value: d.count })), [sortedCategory]);
  const commodityStackData = useMemo(() => (commodityVsCat || []), [commodityVsCat]);
  const custVsCatData      = useMemo(() => (custVsCategory || []).slice(0, 8), [custVsCategory]);
  const categoryKeys       = useMemo(() => { const k = new Set(); (custVsCategory || []).forEach(r => Object.keys(r).forEach(key => { if (key !== "_id") k.add(key); })); return [...k]; }, [custVsCategory]);
  const commodityCatKeys   = useMemo(() => { const k = new Set(); (commodityVsCat || []).forEach(r => Object.keys(r).forEach(key => { if (key !== "_id") k.add(key); })); return [...k]; }, [commodityVsCat]);
  const defectTrendData    = useMemo(() => (monthly || []).map(m => ({ m: m.m, defects: m.defects || 0, ppm: m.ppm || 0 })), [monthly]);
  const radarData          = useMemo(() => (byPart || []).slice(0, 8).map(p => ({ part: (p._id || "").slice(0, 10), count: p.count })), [byPart]);

  const openPreview = (title, chart) => setPreview({ title, chart });

  /* ────────── CHARTS ────────── */

  const CategoryDonut = ({ h = 260 }) => {
    const total = sortedCategory.reduce((s, d) => s + d.count, 0);
    if (!sortedCategory.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie data={sortedCategory} cx="48%" cy="50%"
            innerRadius={40} outerRadius={80}
            dataKey="count" nameKey="_id" paddingAngle={3}
            label={renderPieLabel} labelLine={false}>
            {sortedCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} formatter={fmtNum} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const TopPartsBar = ({ h = 260 }) => {
    const cnt = sortedParts.length;
    const chartH = h || Math.max(260, cnt * 28 + 80);
    if (!sortedParts.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={sortedParts} margin={{ top: 20, right: 16, bottom: 10, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="_id" angle={-30} tick={{ fontSize: 10, fill: "#475569" }} textAnchor="end" height={68} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name="Complaint Count" radius={[4,4,0,0]} shape={<Bar3D fill="#f59e0b" />}>
            {sortedParts.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
            <LabelList dataKey="count" position="top" style={LABEL_S} />
          </Bar>
          <Legend verticalAlign="bottom"  wrapperStyle={{ fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const PARETO_COLORS = [
  "#ef4444", // top (critical)
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
];

  const ParetoChart = ({ h = 260 }) => {
    if (!paretoData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={paretoData} margin={{ top: 20, right: 10, bottom: 12, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-20} textAnchor="end" height={76} interval={0} />
          <YAxis yAxisId="l" tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <YAxis yAxisId="r" orientation="right" domain={[0,100]} tick={{ fontSize: 10, fill: "#ef4444" }} width={38} tickFormatter={v => `${v}%`} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar
            yAxisId="l"
            dataKey="count"
            name="Qty"
            radius={[4, 4, 0, 0]}
            shape={<Bar3D />}
          >
            {paretoData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PARETO_COLORS[index % PARETO_COLORS.length]}
              />
            ))}

            <LabelList
              dataKey="count"
              position="top"
              style={LABEL_S}
              formatter={fmtNum}
            />
          </Bar>
          <Line yAxisId="r" type="monotone" dataKey="cumm" name="Cumulative %" stroke="#e53935" strokeWidth={2.5}
            dot={{ r: 4, fill: "#e53935", filter: "drop-shadow(0 2px 4px rgba(229,57,53,0.5))" }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const CatVsPartStacked = ({ h = 280 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={catVsPart || []} margin={{ top: 20, right: 10, bottom: 10, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {PARTS_LIST.map((part, i) => (
          <Bar key={part} dataKey={part} name={part} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const DefectTrendChart = ({ h = 260 }) => {
    if (!defectTrendData.length || defectTrendData.every(d => !d.defects)) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart data={defectTrendData} margin={{ top: 16, right: 10, bottom: 8, left: 14 }}>
          <defs>
            <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
            <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 0" stroke="#f0f2f5" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#f59e0b" }} width={38} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area yAxisId="left"  type="monotone" dataKey="defects" name="Defects" stroke="#3b82f6" fill="url(#gradD)" strokeWidth={2.5} />
          <Area yAxisId="right" type="monotone" dataKey="ppm"     name="PPM"     stroke="#f59e0b" fill="url(#gradP)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const CustVsCategoryChart = ({ h = 280 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={custVsCatData} margin={{ top: 20, right: 10, bottom: 56, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#64748b" }} angle={-30} textAnchor="end" height={60} interval={0} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {categoryKeys.map((cat, i) => (
          <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const DefectVsCommodityChart = ({ h = 280 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={commodityStackData} margin={{ top: 20, right: 10, bottom: 48, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#64748b" }} angle={-15} textAnchor="end" height={52} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {commodityCatKeys.map((cat, i) => (
          <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const PartRadarChart = ({ h = 260 }) => {
    if (!radarData.length) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="part" tick={{ fontSize: 10, fill: "#64748b" }} />
          <PolarRadiusAxis angle={30} tick={{ fontSize: 9, fill: "#94a3b8" }} />
          <Radar name="Complaint Count" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.22} strokeWidth={2.5} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const CategoryTreemap = ({ h = 260 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <Treemap data={treemapData} dataKey="size" nameKey="name" aspectRatio={4/3} content={<TreemapContent />}>
        <Tooltip content={<ChartTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );

  const CommodityPieChart = ({ h = 260 }) => {
    const data = (byCommodity || []).map(c => ({ name: c._id || "Unknown", value: c.count }));
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!data.length || total === 0) return <ZeroData />;
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie data={data} cx="50%" cy="48%" outerRadius={h > 300 ? 110 : 80}
            dataKey="value" nameKey="name" paddingAngle={4}
            label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
            labelLine={{ stroke: "#e2e8f0" }}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 80 }}>


      {/* Row 1 — Category Donut + Parts bar + Commodity Pie */}
      <Grid cols={4}>

        <ChartCard title="Defect Category Breakdown" icon="🍩" loading={isLoading}
          onExpand={() => openPreview("Defect Category Breakdown", <CategoryDonut h={100} />)}>
          <CategoryDonut />
        </ChartCard>

        <ChartCard title="Most Reported Defective Parts" icon="🔩" tag="Top 12" tagColor="orange" loading={isLoading}
          onExpand={() => openPreview("Most Reported Parts", <TopPartsBar h={380} />)}>
          <TopPartsBar />
        </ChartCard>

        <ChartCard title="Which Parts Fail Most — Radar View" icon="🎯" loading={isLoading}
          onExpand={() => openPreview("Part Frequency Radar", <PartRadarChart h={380} />)}>
          <PartRadarChart />
        </ChartCard>

        <ChartCard title="Product Type Split (IDU / ODU)" icon="⚙️" loading={isLoading}
          onExpand={() => openPreview("Product Type Split", <CommodityPieChart h={380} />)}>
          <CommodityPieChart />
        </ChartCard>

      </Grid>

      {/* Row 2 — Trend + Part Radar + Treemap */}
      <Grid cols={3}>
        <ChartCard title="Monthly Defect Volume & Quality Rate" icon="📈" tag="12 Months" tagColor="blue" loading={isLoading}
          onExpand={() => openPreview("Monthly Defect Trend", <DefectTrendChart h={380} />)}>
          <DefectTrendChart />
        </ChartCard>

        <ChartCard title="Defect Category Volume Map" icon="🗂️" tag="Proportional" tagColor="cyan" loading={isLoading}
          onExpand={() => openPreview("Category Volume Map", <CategoryTreemap h={380} />)}>
          <CategoryTreemap />
        </ChartCard>

        <ChartCard title="Top 10 Defect Types — 80/20 Priority Analysis" icon="📊" tag="80/20 Rule" tagColor="volcano" loading={isLoading}
          onExpand={() => openPreview("Pareto Analysis", <ParetoChart h={440} />)}>
          <ParetoChart />
        </ChartCard>

      </Grid>

      {/* Row 3 — Pareto (full width) */}
      

      {/* Row 4 — Customer vs Category + Commodity vs Category */}
      <Grid cols={3}>
        <ChartCard title="Defect Type Breakdown by Brand" icon="🏭" tag="Stacked" tagColor="geekblue"
          loading={isLoading} onExpand={() => openPreview("Defect by Brand", <CustVsCategoryChart h={400} />)}>
          <CustVsCategoryChart />
        </ChartCard>

        <ChartCard title="Defect Types in IDU vs ODU Units" icon="🔧" tag="Stacked" tagColor="cyan"
          loading={isLoading} onExpand={() => openPreview("Defect vs Product Type", <DefectVsCommodityChart h={400} />)}>
          <DefectVsCommodityChart />
        </ChartCard>

         <ChartCard title="Defect Category vs Defective Part (Stacked View)" icon="📦"
            loading={isLoading} onExpand={() => openPreview("Category vs Part", <CatVsPartStacked h={420} />)}>
            <CatVsPartStacked />
          </ChartCard>
          
      </Grid>

      {/* Row 5 — Cat vs Part Stacked (full width) */}


      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}