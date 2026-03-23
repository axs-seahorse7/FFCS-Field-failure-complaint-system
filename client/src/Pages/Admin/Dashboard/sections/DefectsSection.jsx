// sections/DefectsSection.jsx
import { useState, useMemo } from "react";
import { Row, Col, Select, Button, Space } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from "recharts";
import { SectionCard, ChartTooltip, Loading, FilterBar, CHART_COLORS, fmtNum } from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

const { Option } = Select;

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  const r = outerRadius + 24;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return percent > 0.04 ? (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12} fontWeight={500}>
      {`${name.split(" ")[0]} ${(percent * 100).toFixed(1)}%`}
    </text>
  ) : null;
};

export default function DefectsSection({ addToast }) {
  const [customer, setCustomer] = useState("");
  const [preview, setPreview]   = useState(null);

  const params = useMemo(() => {
    const p = {};
    if (customer) p.customerName = customer;
    return p;
  }, [customer]);

  const { data: byCategory, loading: catLoading } = useApi("/complaints/by-category", params);
  const { data: byPart,     loading: partLoading } = useApi("/complaints/by-part",     params);
  const { data: topDefects, loading: defLoading }  = useApi("/complaints/top-defects", params);
  const { data: catVsPart }                        = useApi("/complaints/category-vs-part", params);

  const sortedParts    = useMemo(() => (byPart    || []).sort((a, b) => b.count - a.count).slice(0, 12), [byPart]);
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

  const openPreview = (title, chart, subtitle = "") => setPreview({ title, subtitle, chart });

  // ── Chart builders ──────────────────────────────────────────────────────────

  const CategoryDonut = ({ height = 300 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={sortedCategory} cx="48%" cy="50%"
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

  const ParetoChart = ({ height = 280 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={paretoData} margin={{ top: 8, right: 60, bottom: 40, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-25} textAnchor="end" height={56} interval={0} />
        <YAxis yAxisId="l" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={v => v + "%"} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar yAxisId="l" dataKey="count" name="Qty" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} formatter={fmtNum} />
        </Bar>
        <Line yAxisId="r" type="monotone" dataKey="cumm" name="Cumm %" stroke="#e53935" strokeWidth={2.5} dot={{ r: 4, fill: "#e53935" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const CatVsPartStacked = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={catVsPart || []} margin={{ top: 8, right: 10, bottom: 30, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-15} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {["IDU PCB","ODU PCB","DISPLAY PCB","REMOTE","IDU MOTOR","OTHER"].map((part, i) => (
          <Bar key={part} dataKey={part} name={part} stackId="a" fill={CHART_COLORS[i]} />
        ))}
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

      <FilterBar>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Filter by:</span>
        <Select className="pg-select" placeholder="All Customers" allowClear style={{ minWidth: 160 }}
          onChange={v => setCustomer(v || "")}>
          {["GODREJ","HAIER","AMSTRAD","ONIDA","MARQ","CROMA","VOLTAS","BLUE STAR","SAMSUNG","LG"].map(c =>
            <Option key={c}>{c}</Option>
          )}
        </Select>
      </FilterBar>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="Defect Category Distribution" icon="🍩"
            extra={expandBtn("Defect Category Distribution", <CategoryDonut height={380} />, "Donut breakdown")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Defect Category Distribution", <CategoryDonut height={380} />)}>
              {catLoading ? <Loading /> : <CategoryDonut />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="Top Defective Parts" icon="🔩"
            extra={expandBtn("Top Defective Parts", <TopPartsBar height={380} />, "Sorted by count")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Top Defective Parts", <TopPartsBar height={380} />)}>
              {partLoading ? <Loading /> : <TopPartsBar />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="Top 10 Defects — Pareto Analysis" icon="📊"
        extra={expandBtn("Pareto Analysis", <ParetoChart height={380} />, "Top 10 defects with cumulative %")}>
        <div style={{ cursor: "pointer" }} onClick={() => openPreview("Pareto Analysis", <ParetoChart height={380} />)}>
          {defLoading ? <Loading height={280} /> : <ParetoChart />}
        </div>
      </SectionCard>

      <SectionCard title="Defect Category vs Defective Part (Stacked)" icon="📊"
        extra={expandBtn("Category vs Part", <CatVsPartStacked height={380} />, "Stacked bar breakdown")}>
        <div style={{ cursor: "pointer" }} onClick={() => openPreview("Category vs Part (Stacked)", <CatVsPartStacked height={380} />)}>
          {!catVsPart ? <Loading height={260} /> : <CatVsPartStacked />}
        </div>
      </SectionCard>

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
