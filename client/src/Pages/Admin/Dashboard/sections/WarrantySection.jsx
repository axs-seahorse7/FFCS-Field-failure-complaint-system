// sections/WarrantySection.jsx
import { useState } from "react";
import { Row, Col, Tag, Button } from "antd";
import { ExpandAltOutlined } from "@ant-design/icons";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from "recharts";
import { KpiCard, SectionCard, ChartTooltip, Loading, CHART_COLORS, fmtNum } from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

const DOA_COLORS = { DOA: "#e53935", IW: "#f59e0b", OOW: "#3b82f6" };
const RADIAN = Math.PI / 180;

const renderDoaLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
  if (percent < 0.05) return null;
  const r = outerRadius + 26;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={13} fontWeight={600}>
      {name}: {fmtNum(value)}
    </text>
  );
};

export default function WarrantySection({ addToast }) {
  const [preview, setPreview] = useState(null);

  const { data: doaData,       loading: doaLoading }  = useApi("/complaints/by-doa");
  const { data: ppmTrend,      loading: ppmLoading }  = useApi("/complaints/ppm-trend");
  const { data: byCommodity,   loading: commLoading } = useApi("/complaints/by-commodity");
  const { data: commVsCat }                           = useApi("/complaints/commodity-vs-category");
  const { data: byReplacement, loading: replLoading } = useApi("/complaints/by-replacement");
  const { data: stats }                               = useApi("/complaints/stats");

  const doaPieData = (doaData || [])?.sort((a, b) => b.count - a.count);
  const commSorted = (byCommodity || [])?.sort((a, b) => b.count - a.count);
  const replSorted = (byReplacement || [])?.sort((a, b) => b.count - a.count);

  const openPreview = (title, chart, subtitle = "") => setPreview({ title, subtitle, chart });

  const ppmKpis = [
    { label: "Avg IDU PPM",  value: fmtNum(stats?.avgPpm  || 0), color: "red",    icon: "📈" },
    { label: "CY 2023 PPM",  value: fmtNum(stats?.ppm2023 || 0), color: "blue",   icon: "📅" },
    { label: "CY 2024 PPM",  value: fmtNum(stats?.ppm2024 || 0), color: "amber",  icon: "📅" },
    { label: "DOA Count",    value: fmtNum(doaData?.find(d => d._id === "DOA")?.count || 0), color: "orange", icon: "⚠️" },
  ];

  // ── Chart builders ──────────────────────────────────────────────────────────

  const DoaDonut = ({ height = 290 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={doaPieData} cx="48%" cy="50%"
          innerRadius={height > 350 ? 85 : 65} outerRadius={height > 350 ? 130 : 100}
          dataKey="count" nameKey="_id" paddingAngle={4}
          label={renderDoaLabel} labelLine={false}
        >
          {doaPieData.map((d, i) => <Cell key={i} fill={DOA_COLORS[d._id] || CHART_COLORS[i]} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} formatter={fmtNum} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  const PpmLine = ({ height = 290 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={ppmTrend || []} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line type="monotone" dataKey="ppm" name="IDU PPM" stroke="#e53935" strokeWidth={2.5}
          dot={{ r: 5, fill: "#e53935" }} activeDot={{ r: 7 }}>
          <LabelList dataKey="ppm" position="top" style={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} formatter={fmtNum} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );

  const CommodityBar = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={commSorted} layout="vertical" margin={{ left: 10, right: 60, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis dataKey="_id" type="category" width={50} tick={{ fontSize: 14, fill: "#475569", fontWeight: 700 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Complaints" radius={[0, 6, 6, 0]}>
          <Cell fill="#3b82f6" /><Cell fill="#8b5cf6" />
          <LabelList dataKey="count" position="right" style={{ fontSize: 13, fill: "#475569", fontWeight: 700 }} formatter={fmtNum} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const CommVsCatStacked = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={commVsCat || []} margin={{ top: 4, right: 10, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="_id" tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {["ELEC PART DEFECTS","PART BROKEN / DAMAGED / MISSING","LEAK","NOISE","MISC DEFECT"].map((cat, i) => (
          <Bar key={cat} dataKey={cat} name={cat.split(" ")[0]} stackId="a" fill={CHART_COLORS[i]}>
            <LabelList dataKey={cat} position="center" style={{ fontSize: 11, fill: "#fff", fontWeight: 700 }} formatter={v => v > 5 ? v : ""} />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const ReplacementBar = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={replSorted} layout="vertical" margin={{ left: 10, right: 50, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis dataKey="_id" type="category" width={60} tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
          {replSorted.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
          <LabelList dataKey="count" position="right" style={{ fontSize: 13, fill: "#475569", fontWeight: 700 }} formatter={fmtNum} />
        </Bar>
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

      <Row gutter={[14, 14]}>
        {ppmKpis.map(k => (
          <Col key={k.label} xs={12} lg={6}><KpiCard {...k} loading={!stats} /></Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="DOA vs IW vs OOW" icon="🍩"
            extra={expandBtn("DOA vs IW vs OOW", <DoaDonut height={400} />, "Warranty type breakdown")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("DOA vs IW vs OOW", <DoaDonut height={400} />)}>
              {doaLoading ? <Loading /> : <DoaDonut />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="Monthly PPM Trend" icon="📈"
            extra={
              <>
                <Tag color="red" style={{ fontSize: 12, borderRadius: 8 }}>Parts Per Million</Tag>
                {expandBtn("Monthly PPM Trend", <PpmLine height={400} />)}
              </>
            }
          >
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Monthly PPM Trend", <PpmLine height={400} />)}>
              {ppmLoading ? <Loading /> : <PpmLine />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <SectionCard title="IDU vs ODU Split" icon="📦"
            extra={expandBtn("IDU vs ODU Split", <CommodityBar height={380} />)}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("IDU vs ODU Split", <CommodityBar height={380} />)}>
              {commLoading ? <Loading /> : <CommodityBar />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={9}>
          <SectionCard title="Commodity vs Defect Category" icon="📊"
            extra={expandBtn("Commodity vs Category", <CommVsCatStacked height={380} />)}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Commodity vs Category", <CommVsCatStacked height={380} />)}>
              {!commVsCat ? <Loading /> : <CommVsCatStacked />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={7}>
          <SectionCard title="Replacement Category" icon="🔄"
            extra={expandBtn("Replacement Category", <ReplacementBar height={380} />)}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Replacement Category", <ReplacementBar height={380} />)}>
              {replLoading ? <Loading /> : <ReplacementBar />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      <ChartPreviewModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title} subtitle={preview?.subtitle}>
        {preview?.chart}
      </ChartPreviewModal>
    </div>
  );
}
