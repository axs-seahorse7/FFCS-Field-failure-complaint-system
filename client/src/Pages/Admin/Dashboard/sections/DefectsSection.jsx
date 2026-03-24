// sections/DefectsSection.jsx
import { useState, useMemo } from "react";
import { Row, Col, Select, Button, Space, Tag } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from "recharts";
import {
  SectionCard, ChartTooltip, Loading, FilterBar, CHART_COLORS, fmtNum,
} from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

const { Option } = Select;

/* ── Constants ───────────────────────────────────────────────────── */
const RADIAN = Math.PI / 180;

const PARTS_LIST = [
  "IDU PCB","ODU PCB","DISPLAY PCB","REMOTE",
  "IDU MOTOR","ODU MOTOR","SWING MOTOR","COMPRESSOR",
  "EVAPORATOR COIL","CONDENSER COIL",
];

const COMMODITY_COLORS = { IDU: "#3b82f6", ODU: "#f59e0b", OTHER: "#94a3b8" };

/* ── Custom pie label ────────────────────────────────────────────── */
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  const r = outerRadius + 24;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return percent > 0.04 ? (
    <text
      x={x} y={y} fill="#475569"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12} fontWeight={500}
    >
      {`${(name || "").split(" ")[0]} ${(percent * 100).toFixed(1)}%`}
    </text>
  ) : null;
};

/* ── Treemap custom content ─────────────────────────────────────── */
const TreemapContent = ({ x, y, width, height, name, value, depth, index }) => {
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect
        x={x + 2} y={y + 2}
        width={width - 4} height={height - 4}
        style={{ fill: CHART_COLORS[index % CHART_COLORS.length], stroke: "#fff", strokeWidth: 2, opacity: 0.88 }}
        rx={4}
      />
      {width > 60 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
          fill="#fff" fontSize={Math.min(12, width / 8)} fontWeight={600}>
          {(name || "").slice(0, 14)}
        </text>
      )}
      {width > 60 && height > 44 && (
        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
          fill="rgba(255,255,255,0.85)" fontSize={11}>
          {value}
        </text>
      )}
    </g>
  );
};

/* ════════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function DefectsSection({ addToast }) {
  const [customer, setCustomer] = useState("");
  const [preview,  setPreview]  = useState(null);

  const params = useMemo(() => {
    const p = {};
    if (customer) p.customerName = customer;
    return p;
  }, [customer]);

  /* ── API calls (all original + new) ────────────────────────────── */
  const { data: byCategory,    loading: catLoading    } = useApi("/complaints/by-category",        params);
  const { data: byPart,        loading: partLoading    } = useApi("/complaints/by-part",            params);
  const { data: topDefects,    loading: defLoading     } = useApi("/complaints/top-defects",        params);
  const { data: catVsPart                              } = useApi("/complaints/category-vs-part",   params);
  const { data: monthly,       loading: monthlyLoading } = useApi("/complaints/monthly",            params);  // NEW — for category trend
  const { data: custVsCategory                         } = useApi("/complaints/customer-vs-category", params); // NEW
  const { data: commodityVsCat                         } = useApi("/complaints/commodity-vs-category", params);// NEW
  const { data: byCommodity,   loading: commLoading    } = useApi("/complaints/by-commodity",       params);  // NEW

  /* ── Derived / sorted data ──────────────────────────────────────── */
  const sortedParts    = useMemo(() => (byPart     || []).sort((a, b) => b.count - a.count).slice(0, 12), [byPart]);
  const sortedDefects  = useMemo(() => (topDefects || []).sort((a, b) => b.count - a.count).slice(0, 10), [topDefects]);
  const sortedCategory = useMemo(() => (byCategory || []).sort((a, b) => b.count - a.count), [byCategory]);

  /* Pareto data (original logic, unchanged) */
  const paretoData = useMemo(() => {
    const total = sortedDefects.reduce((s, d) => s + d.count, 0);
    let cum = 0;
    return sortedDefects.map(d => {
      cum += d.count;
      return {
        ...d,
        name:  (d._id || d.name || "").slice(0, 22),
        cumm:  +((cum / total) * 100).toFixed(1),
      };
    });
  }, [sortedDefects]);

  /* Treemap data for defect category */
  const treemapData = useMemo(() =>
    (sortedCategory || []).map(d => ({ name: d._id || "Unknown", size: d.count, value: d.count }))
  , [sortedCategory]);

  /* Commodity vs category stacked data */
  const commodityStackData = useMemo(() => (commodityVsCat || []), [commodityVsCat]);

  /* Customer vs category stacked — top 8 customers */
  const custVsCatData = useMemo(() =>
    (custVsCategory || []).slice(0, 8)
  , [custVsCategory]);

  /* All category keys for stacked bars */
  const categoryKeys = useMemo(() => {
    const keys = new Set();
    (custVsCategory || []).forEach(row =>
      Object.keys(row).forEach(k => { if (k !== "_id") keys.add(k); })
    );
    return Array.from(keys);
  }, [custVsCategory]);

  const commodityCatKeys = useMemo(() => {
    const keys = new Set();
    (commodityVsCat || []).forEach(row =>
      Object.keys(row).forEach(k => { if (k !== "_id") keys.add(k); })
    );
    return Array.from(keys);
  }, [commodityVsCat]);

  /* Monthly defect area data */
  const defectTrendData = useMemo(() =>
    (monthly || []).map(m => ({ m: m.m, defects: m.defects || 0, ppm: m.ppm || 0 }))
  , [monthly]);

  /* Radar for part frequency */
  const radarData = useMemo(() =>
    (byPart || []).slice(0, 8).map(p => ({ part: (p._id || "").slice(0, 10), count: p.count }))
  , [byPart]);

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const openPreview  = (title, chart, subtitle = "") => setPreview({ title, subtitle, chart });

  const expandBtn = (title, chart, subtitle) => (
    <Button
      type="text" size="small" icon={<ExpandAltOutlined />}
      onClick={e => { e.stopPropagation(); openPreview(title, chart, subtitle); }}
      style={{ color: "#94a3b8", fontSize: 13 }}
    />
  );

  const LABEL_STYLE = { fontSize: 12, fill: "#475569", fontWeight: 500 };

  /* ════════════════════════════════════════════════════════════════
     CHART BUILDERS
  ════════════════════════════════════════════════════════════════ */

  /* 1 ── Category Donut (original) */
  const CategoryDonut = ({ height = 300 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={sortedCategory} cx="48%" cy="50%"
          innerRadius={height > 350 ? 90 : 68} outerRadius={height > 350 ? 140 : 108}
          dataKey="count" nameKey="_id" paddingAngle={3}
          label={renderPieLabel} labelLine={false}
        >
          {sortedCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} formatter={fmtNum} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* 2 ── Top Parts Horizontal Bar (original) */
  const TopPartsBar = ({ height = 300 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedParts} layout="vertical" margin={{ left: 10, right: 50, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis dataKey="_id" type="category" width={120} tick={{ fontSize: 12, fill: "#475569" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
          {sortedParts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: "#475569", fontWeight: 600 }} formatter={fmtNum} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  /* 3 ── Pareto Chart (original) */
  const ParetoChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={paretoData} margin={{ top: 8, right: 60, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-25} textAnchor="end" height={56} interval={0} />
        <YAxis yAxisId="l" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]}
          tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={v => v + "%"} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="l" dataKey="count" name="Qty" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} formatter={fmtNum} />
        </Bar>
        <Line yAxisId="r" type="monotone" dataKey="cumm" name="Cumm %" stroke="#e53935"
          strokeWidth={2.5} dot={{ r: 4, fill: "#e53935" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  /* 4 ── Category vs Part Stacked (original) */
  const CatVsPartStacked = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={catVsPart || []} margin={{ top: 8, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-15} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {PARTS_LIST.map((part, i) => (
          <Bar key={part} dataKey={part} name={part} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  /* 5 ── Defect Category over Time — Area (NEW) */
  const DefectTrendChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={defectTrendData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradDefect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPpm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="left"  tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#f59e0b" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Area yAxisId="left"  type="monotone" dataKey="defects" name="Defects" stroke="#3b82f6" fill="url(#gradDefect)" strokeWidth={2.5} />
        <Area yAxisId="right" type="monotone" dataKey="ppm"     name="PPM"     stroke="#f59e0b" fill="url(#gradPpm)"    strokeWidth={2}   />
      </AreaChart>
    </ResponsiveContainer>
  );

  /* 6 ── Defect Category vs Customer — Stacked Bar (NEW) */
  const CustVsCategoryChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={custVsCatData} margin={{ top: 8, right: 10, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#64748b" }} angle={-30} textAnchor="end" height={52} interval={0} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {categoryKeys.map((cat, i) => (
          <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  /* 7 ── Defect vs Commodity — Stacked Bar (NEW) */
  const DefectVsCommodityChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={commodityStackData} margin={{ top: 8, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#64748b" }} angle={-15} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {commodityCatKeys.map((cat, i) => (
          <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  /* 8 ── Part Frequency Radar (NEW) */
  const PartRadarChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="part" tick={{ fontSize: 12, fill: "#64748b" }} />
        <PolarRadiusAxis angle={30} tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Radar name="Complaint Count" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </RadarChart>
    </ResponsiveContainer>
  );

  /* 9 ── Category Treemap (NEW) */
  const CategoryTreemap = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={treemapData}
        dataKey="size"
        nameKey="name"
        aspectRatio={4 / 3}
        content={<TreemapContent />}
      >
        <Tooltip content={<ChartTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );

  /* 10 ── Commodity Pie (NEW) */
  const CommodityPieChart = ({ height = 260 }) => {
    const data = (byCommodity || []).map(c => ({ name: c._id || "Unknown", value: c.count }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="48%"
            outerRadius={height > 300 ? 110 : 88}
            dataKey="value" nameKey="name" paddingAngle={4}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: "#e2e8f0" }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={COMMODITY_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Filter Bar (original, unchanged) ── */}
      <FilterBar>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Filter by:</span>
        <Select
          className="pg-select"
          placeholder="All Customers"
          allowClear
          style={{ minWidth: 160 }}
          onChange={v => setCustomer(v || "")}
        >
          {["GODREJ","HAIER","AMSTRAD","ONIDA","MARQ","CROMA","VOLTAS","BLUE STAR","SAMSUNG","LG"].map(c =>
            <Option key={c}>{c}</Option>
          )}
        </Select>
      </FilterBar>

      {/* ════════ ROW 1 — Category Donut + Top Parts + Commodity Pie ════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard
            title="Defect Category Distribution" icon="🍩"
            extra={expandBtn("Defect Category Distribution", <CategoryDonut height={400} />, "Donut breakdown")}
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Defect Category Distribution", <CategoryDonut height={400} />)}>
              {catLoading ? <Loading /> : <CategoryDonut />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard
            title="Top Defective Parts" icon="🔩"
            extra={
              <Space>
                <Tag color="orange" style={{ fontSize: 12, borderRadius: 8 }}>Top 12</Tag>
                {expandBtn("Top Defective Parts", <TopPartsBar height={400} />, "Sorted by count")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Top Defective Parts", <TopPartsBar height={400} />)}>
              {partLoading ? <Loading /> : <TopPartsBar />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard
            title="Commodity Split (IDU / ODU)" icon="⚙️"
            extra={expandBtn("Commodity Split", <CommodityPieChart height={400} />, "IDU vs ODU")}
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Commodity Split", <CommodityPieChart height={400} />)}>
              {commLoading ? <Loading /> : <CommodityPieChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════ ROW 2 — Defect Trend + Part Radar + Treemap ════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard
            title="Defect Volume Trend (Monthly)" icon="📈"
            extra={
              <Space>
                <Tag color="blue" style={{ fontSize: 12, borderRadius: 8 }}>Last 12 months</Tag>
                {expandBtn("Defect Trend", <DefectTrendChart height={380} />, "Monthly defects + PPM")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Defect Volume Trend", <DefectTrendChart height={380} />, "Monthly + PPM")}>
              {monthlyLoading ? <Loading /> : <DefectTrendChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard
            title="Part Frequency Radar" icon="🎯"
            extra={expandBtn("Part Radar", <PartRadarChart height={380} />, "Top 8 parts")}
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Part Frequency Radar", <PartRadarChart height={380} />)}>
              {partLoading ? <Loading /> : <PartRadarChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={8}>
          <SectionCard
            title="Category Treemap" icon="🗂️"
            extra={
              <Space>
                <Tag color="cyan" style={{ fontSize: 12, borderRadius: 8 }}>Area = Volume</Tag>
                {expandBtn("Category Treemap", <CategoryTreemap height={380} />, "Proportional view")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Category Treemap", <CategoryTreemap height={380} />)}>
              {catLoading ? <Loading /> : <CategoryTreemap />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════ ROW 3 — Pareto (full width) ════════ */}
      <SectionCard
        title="Top 10 Defects — Pareto Analysis" icon="📊"
        extra={
          <Space>
            <Tag color="volcano" style={{ fontSize: 12, borderRadius: 8 }}>80/20 Rule</Tag>
            {expandBtn("Pareto Analysis", <ParetoChart height={400} />, "Top 10 defects with cumulative %")}
          </Space>
        }
      >
        <div style={{ cursor: "pointer" }}
          onClick={() => openPreview("Pareto Analysis", <ParetoChart height={400} />)}>
          {defLoading ? <Loading height={280} /> : <ParetoChart />}
        </div>
      </SectionCard>

      {/* ════════ ROW 4 — Customer vs Category + Commodity vs Category ════════ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SectionCard
            title="Defect Category by Customer" icon="🏭"
            extra={
              <Space>
                <Tag color="geekblue" style={{ fontSize: 12, borderRadius: 8 }}>Stacked</Tag>
                {expandBtn("Customer vs Category", <CustVsCategoryChart height={400} />, "Customer breakdown")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Defect Category by Customer", <CustVsCategoryChart height={400} />)}>
              {!custVsCategory ? <Loading /> : <CustVsCategoryChart />}
            </div>
          </SectionCard>
        </Col>

        <Col xs={24} lg={12}>
          <SectionCard
            title="Defect vs Commodity (IDU / ODU)" icon="🔧"
            extra={
              <Space>
                <Tag color="cyan" style={{ fontSize: 12, borderRadius: 8 }}>Stacked</Tag>
                {expandBtn("Defect vs Commodity", <DefectVsCommodityChart height={400} />, "IDU vs ODU per category")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }}
              onClick={() => openPreview("Defect vs Commodity", <DefectVsCommodityChart height={400} />)}>
              {!commodityVsCat ? <Loading /> : <DefectVsCommodityChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* ════════ ROW 5 — Cat vs Part Stacked (original, full width) ════════ */}
      <SectionCard
        title="Defect Category vs Defective Part (Stacked)" icon="📦"
        extra={expandBtn("Category vs Part", <CatVsPartStacked height={400} />, "Stacked bar breakdown")}
      >
        <div style={{ cursor: "pointer" }}
          onClick={() => openPreview("Category vs Part (Stacked)", <CatVsPartStacked height={400} />)}>
          {!catVsPart ? <Loading height={260} /> : <CatVsPartStacked />}
        </div>
      </SectionCard>

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