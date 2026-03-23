// sections/OverviewSection.jsx
import { useState, useMemo } from "react";
import { Row, Col, Select, DatePicker, Button, Tag, Space } from "antd";
import { ReloadOutlined, ExpandAltOutlined } from "@ant-design/icons";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";
import { KpiCard, SectionCard, ChartTooltip, Loading, FilterBar, CHART_COLORS, fmtNum, StatusBadge } from "../components/shared";
import { useApi } from "../components/useApi";
import ChartPreviewModal from "../components/ChartPreviewModal";

const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_PIE_COLORS = {
  Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8"
};

export default function OverviewSection({ addToast }) {
  const [customer, setCustomer]   = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [preview, setPreview]     = useState(null); // { title, subtitle, chart }

  const params = useMemo(() => {
    const p = {};
    if (customer) p.customerName = customer;
    if (dateRange?.[0]) p.from = dateRange[0].toISOString();
    if (dateRange?.[1]) p.to   = dateRange[1].toISOString();
    return p;
  }, [customer, dateRange]);

  const { data: stats,   loading: statsLoading,   refetch: rStats }   = useApi("/complaints/stats",    params);
  const { data: monthly, loading: monthlyLoading, refetch: rMonthly } = useApi("/complaints/monthly",  params);
  const { data: daily,   loading: dailyLoading }                      = useApi("/complaints/daily",    params);
  const { data: byStatus }                                             = useApi("/complaints/by-status", params);

  const handleRefresh = () => { rStats(params); rMonthly(params); };

  const statusData = useMemo(() =>
    (byStatus || []).map(s => ({ name: s._id, value: s.count }))
  , [byStatus]);

  const areaData = useMemo(() =>
    (monthly || []).map(m => ({ ...m, resolved: Math.round((m.defects || 0) * 0.7) }))
  , [monthly]);

  const kpis = [
    { label: "Total Complaints", value: fmtNum(stats?.total    || 0), color: "blue",   icon: "📋", sub: "All time" },
    { label: "Open",             value: fmtNum(stats?.open     || 0), color: "red",    icon: "🔴", sub: "Needs attention", trend: 5 },
    { label: "Resolved",         value: fmtNum(stats?.resolved || 0), color: "green",  icon: "✅", sub: "Completed" },
    { label: "Pending",          value: fmtNum(stats?.pending  || 0), color: "amber",  icon: "⏳", sub: "In progress" },
    { label: "Avg Resolution",   value: `${stats?.avgDays || 0}d`,    color: "purple", icon: "⏱", sub: "Days to close" },
  ];

  const openPreview = (title, chartEl, subtitle = "") =>
    setPreview({ title, subtitle, chart: chartEl });

  // ─── Reusable chart builders ───────────────────────────────────────────────

  const MonthlyLineChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={monthly || []} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line type="monotone" dataKey="defects" name="Complaints" stroke="#e53935" strokeWidth={2.5} dot={{ r: 4, fill: "#e53935" }} activeDot={{ r: 6 }}>
          <LabelList dataKey="defects" position="top" style={{ fontSize: 11, fill: "#64748b" }} formatter={v => v || ""} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );

  const StatusDonutChart = ({ height = 260 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={statusData} cx="45%" cy="50%" innerRadius={height > 300 ? 80 : 60} outerRadius={height > 300 ? 120 : 95}
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

  const DailyBarChart = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={(daily || []).slice(-30)} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
        <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Complaints" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#64748b" }} formatter={v => v > 5 ? v : ""} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const AreaTrendChart = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={areaData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
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

  const expandBtn = (title, chartEl, subtitle) => (
    <Button
      type="text" size="small"
      icon={<ExpandAltOutlined />}
      onClick={() => openPreview(title, chartEl, subtitle)}
      style={{ color: "#94a3b8", fontSize: 13 }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <FilterBar>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Filters:</span>
        <RangePicker className="pg-datepicker" onChange={setDateRange}
          style={{ borderRadius: 10, fontSize: 13 }} placeholder={["From date", "To date"]} />
        <Select className="pg-select" placeholder="All Customers" allowClear style={{ minWidth: 160 }}
          onChange={v => setCustomer(v || "")}>
          {["GODREJ","HAIER","AMSTRAD","ONIDA","MARQ","CROMA","VOLTAS","BLUE STAR","BPL","SAMSUNG","LG"].map(c =>
            <Option key={c}>{c}</Option>
          )}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}
          style={{ borderRadius: 10, fontWeight: 600, fontSize: 13, borderColor: "#e2e8f0" }}>
          Refresh
        </Button>
      </FilterBar>

      <Row gutter={[14, 14]}>
        {kpis.map(k => (
          <Col key={k.label} xs={24} sm={12} lg={Math.floor(24 / kpis.length)}>
            <KpiCard {...k} loading={statsLoading} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <SectionCard title="Complaints Over Time (Monthly)" icon="📈"
            extra={
              <Space>
                <Tag color="blue" style={{ fontSize: 12, borderRadius: 8 }}>Last 12 months</Tag>
                {expandBtn("Complaints Over Time (Monthly)", <MonthlyLineChart height={380} />, "Monthly trend")}
              </Space>
            }
          >
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Complaints Over Time", <MonthlyLineChart height={380} />, "Monthly trend")}>
              {monthlyLoading ? <Loading /> : <MonthlyLineChart />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={10}>
          <SectionCard title="Status Distribution" icon="🍩"
            extra={expandBtn("Status Distribution", <StatusDonutChart height={380} />, "All statuses")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Status Distribution", <StatusDonutChart height={380} />, "All statuses")}>
              {!byStatus ? <Loading /> : <StatusDonutChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <SectionCard title="Daily Complaints (Last 30 days)" icon="📅"
            extra={expandBtn("Daily Complaints", <DailyBarChart height={380} />, "Last 30 days")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Daily Complaints", <DailyBarChart height={380} />, "Last 30 days")}>
              {dailyLoading ? <Loading /> : <DailyBarChart />}
            </div>
          </SectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <SectionCard title="Created vs Resolved Trend" icon="📊"
            extra={expandBtn("Created vs Resolved Trend", <AreaTrendChart height={380} />, "Monthly comparison")}>
            <div style={{ cursor: "pointer" }} onClick={() => openPreview("Created vs Resolved Trend", <AreaTrendChart height={380} />, "Monthly comparison")}>
              {monthlyLoading ? <Loading /> : <AreaTrendChart />}
            </div>
          </SectionCard>
        </Col>
      </Row>

      {/* Chart Preview Modal */}
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
