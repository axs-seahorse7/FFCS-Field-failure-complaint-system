// sections/ProductionEntryForm.jsx
// Admin form to create/manage monthly production entries
import { useState, useMemo, useCallback } from "react";
import {
  Select, DatePicker, InputNumber, Button, Table, Tag, Popconfirm, message, Tooltip,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined,
  CloseOutlined, ReloadOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useApiQuery } from "../Dashboard/components/useApiQuery.js";
import api from "../../../services/axios-interceptore/api.js"

const { Option } = Select;
const { MonthPicker } = DatePicker;

/* ── Constants ── */
const CUSTOMERS = [
  "CMI","VOLTAS","AMSTRAD","BLUE STAR","GODREJ","ONIDA",
  "LLOYD","WHIRLPOOL","HYUNDAI","KELVIN","ATOR","BPL",
  "CROMA","HAIER","CARRIER","SANSUI","MARQ",
];
const COMMODITIES = ["IDU","ODU","CBU","WAC"];

const COMMODITY_COLORS = {
  IDU: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  ODU: { bg: "#fff7ed", color: "#f97316", border: "#fed7aa" },
  CBU: { bg: "#f0fdf4", color: "#22c55e", border: "#bbf7d0" },
  WAC: { bg: "#faf5ff", color: "#8b5cf6", border: "#ddd6fe" },
};

/* ── Shared shadow style ── */
const CARD_SHADOW = {
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)",
  background: "#fff",
  padding: "20px 24px",
};

/* ── Field label ── */
const FieldLabel = ({ children, required }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 6,
  }}>
    {required && <span style={{ color: "#e53935", marginRight: 3 }}>*</span>}
    {children}
  </div>
);

/* ── Live PPM Preview ── */
const PpmPreview = ({ production, warrantyComplaint }) => {
  const ppm = production > 0 ? ((warrantyComplaint || 0) / production * 1_000_000).toFixed(0) : 0;
  const color = ppm > 40000 ? "#ef4444" : ppm > 10000 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
      borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0",
    }}>
      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>Live PPM Preview</span>
      <span style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "monospace", letterSpacing: 1 }}>
        {Number(ppm).toLocaleString()}
      </span>
      <span style={{
        fontSize: 10, padding: "2px 8px", borderRadius: 20,
        background: ppm > 40000 ? "#fff1f0" : ppm > 10000 ? "#fffbeb" : "#f0fdf4",
        color, border: `1px solid ${ppm > 40000 ? "#fecaca" : ppm > 10000 ? "#fde68a" : "#bbf7d0"}`,
        fontWeight: 700,
      }}>
        {ppm > 40000 ? "Critical" : ppm > 10000 ? "High" : ppm > 0 ? "OK" : "—"}
      </span>
    </div>
  );
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function ProductionEntryForm({ addToast, filterDate }) {
  /* ── Form state ── */
  const [form, setForm] = useState({
    customer: "",
    commodity: "",
    month: null,
    production: null,
    fieldComplaint: 0,
    warrantyComplaint: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [editRow,    setEditRow]    = useState({});

  /* ── API ── */
  const { data: records, loading, refetch } = useApiQuery(`/production/list?year=${filterDate}`);
  const sortedRecords = useMemo(() =>
    [...(records || [])].sort((a, b) => new Date(b.month) - new Date(a.month))
  , [records]);

  /* ── Handlers ── */
  const setField = useCallback((key, val) => setForm(f => ({ ...f, [key]: val })), []);

  const isFormValid = form.customer && form.commodity && form.month && form.production > 0;

  const handleSubmit = async () => {
    if (!isFormValid) { message.warning("Please fill all required fields."); return; }
    setSubmitting(true);
    try {
      const payload = {
        customer:          form.customer,
        commodity:         form.commodity,
        month:             form.month.startOf("month").toISOString(),
        production:        Number(form.production),
        fieldComplaint:    Number(form.fieldComplaint   || 0),
        warrantyComplaint: Number(form.warrantyComplaint || 0),
      };
      await api.post("/production/create", payload);
      message.success("Production record saved!");
      addToast?.("Production entry created", "success");
      setForm({ customer: "", commodity: "", month: null, production: null, fieldComplaint: 0, warrantyComplaint: 0 });
      refetch();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save record.");
      addToast?.("Failed to save", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.post("/production/delete", { id });
      message.success("Record deleted");
      refetch();
    } catch {
      message.error("Delete failed");
    }
  };

  const startEdit = (record) => {
    setEditingId(record._id);
    setEditRow({
      production:        record.production,
      fieldComplaint:    record.fieldComplaint,
      warrantyComplaint: record.warrantyComplaint,
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditRow({}); };

  const saveEdit = async (id) => {
    try {
      await api.post("/production/update", { id, ...editRow });
      message.success("Updated successfully");
      setEditingId(null);
      refetch();
    } catch {
      message.error("Update failed");
    }
  };

  /* ── Summary stats ── */
  const summary = useMemo(() => {
    const arr = records || [];
    const totalProd = arr.reduce((s, r) => s + (r.production || 0), 0);
    const totalWarr = arr.reduce((s, r) => s + (r.warrantyComplaint || 0), 0);
    const avgPpm = totalProd > 0 ? Math.round((totalWarr / totalProd) * 1_000_000) : 0;
    return { totalProd, totalWarr, avgPpm, count: arr.length };
  }, [records]);

  /* ── Table columns ── */
  const columns = [
    {
      title: "Month", dataIndex: "month", key: "month", width: 100,
      render: v => <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
        {dayjs(v).format("MMM YYYY")}
      </span>,
      sorter: (a, b) => new Date(a.month) - new Date(b.month),
    },
    {
      title: "Brand", dataIndex: "customer", key: "customer", width: 110,
      render: v => <b style={{ fontSize: 13, color: "#1e293b" }}>{v}</b>,
    },
    {
      title: "Type", dataIndex: "commodity", key: "commodity", width: 72,
      render: v => {
        const c = COMMODITY_COLORS[v] || COMMODITY_COLORS.IDU;
        return <Tag style={{ fontSize: 11, borderRadius: 6, fontWeight: 700, background: c.bg, color: c.color, borderColor: c.border }}>{v}</Tag>;
      },
    },
    {
      title: "Production", dataIndex: "production", key: "production", width: 120,
      render: (v, r) => editingId === r._id ? (
        <InputNumber size="small" value={editRow.production} min={0} style={{ width: 100 }}
          onChange={val => setEditRow(e => ({ ...e, production: val }))} />
      ) : <span style={{ fontFamily: "monospace", fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{(v || 0).toLocaleString()}</span>,
    },
    {
      title: "Field Complaints", dataIndex: "fieldComplaint", key: "fc", width: 130,
      render: (v, r) => editingId === r._id ? (
        <InputNumber size="small" value={editRow.fieldComplaint} min={0} style={{ width: 90 }}
          onChange={val => setEditRow(e => ({ ...e, fieldComplaint: val }))} />
      ) : <span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{v || 0}</span>,
    },
    {
      title: "Warranty Complaints", dataIndex: "warrantyComplaint", key: "wc", width: 150,
      render: (v, r) => editingId === r._id ? (
        <InputNumber size="small" value={editRow.warrantyComplaint} min={0} style={{ width: 90 }}
          onChange={val => setEditRow(e => ({ ...e, warrantyComplaint: val }))} />
      ) : <span style={{ fontFamily: "monospace", fontSize: 12, color: "#e53935", fontWeight: 600 }}>{v || 0}</span>,
    },
    {
      title: "Warranty PPM", dataIndex: "warrantyPPM", key: "ppm", width: 120,
      render: (v, r) => {
        const val = editingId === r._id
          ? (editRow.production > 0 ? Math.round((editRow.warrantyComplaint / editRow.production) * 1_000_000) : 0)
          : Math.round(v || 0);
        const color = val > 40000 ? "#ef4444" : val > 10000 ? "#f59e0b" : "#22c55e";
        return <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color }}>{val.toLocaleString()}</span>;
      },
      sorter: (a, b) => (a.warrantyPPM || 0) - (b.warrantyPPM || 0),
    },
    {
      title: "Actions", key: "actions", width: 110, fixed: "right",
      render: (_, r) => editingId === r._id ? (
        <div style={{ display: "flex", gap: 4 }}>
          <Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => saveEdit(r._id)}
            style={{ background: "#22c55e", borderColor: "#22c55e", borderRadius: 6, fontSize: 11 }}>Save</Button>
          <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}
            style={{ borderRadius: 6, fontSize: 11 }}>Cancel</Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <Tooltip title="Edit complaints">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => startEdit(r)}
              style={{ color: "#3b82f6", padding: "0 6px" }} />
          </Tooltip>
          <Popconfirm title="Delete this record?" okText="Delete" okType="danger" onConfirm={() => handleDelete(r._id)}>
            <Button type="text" size="small" icon={<DeleteOutlined />}
              style={{ color: "#ef4444", padding: "0 6px" }} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>

      {/* ── Summary KPI strip ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Total Records",       value: summary.count.toLocaleString(),         icon: "📁", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Total Units Produced", value: summary.totalProd.toLocaleString(),     icon: "🏭", color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
          { label: "Warranty Complaints", value: summary.totalWarr.toLocaleString(),      icon: "⚠️", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          { label: "Avg Warranty PPM",    value: summary.avgPpm.toLocaleString(),         icon: "📉", color: summary.avgPpm > 10000 ? "#ef4444" : "#16a34a", bg: summary.avgPpm > 10000 ? "#fff1f0" : "#f0fdf4", border: summary.avgPpm > 10000 ? "#fecaca" : "#bbf7d0" },
        ].map(k => (
          <div key={k.label} style={{ flex: "1 1 160px", minWidth: 160 }}>
            <div style={{
              background: "#fff", border: `1px solid ${k.border}`, borderRadius: 10,
              padding: "10px 14px", height: 82, display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.07)", transition: "box-shadow 0.2s, transform 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace", lineHeight: 1.2 }}>{k.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Entry Form ── */}
      <div style={{ ...CARD_SHADOW }}>

        {/* Form header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #f0f2f5" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff1f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏭</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Add Production Entry</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Enter monthly production data per brand and unit type</div>
          </div>
        </div>

        {/* Form grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>

          {/* Month */}
          <div>
            <FieldLabel required>Month & Year</FieldLabel>
            <DatePicker
              picker="month"
              value={form.month}
              onChange={val => setField("month", val)}
              format="MMM YYYY"
              disabledDate={d => d && d.isAfter(dayjs(), "month")}
              style={{ width: "100%", borderRadius: 8 }}
              placeholder="Select month"
            />
          </div>

          {/* Customer */}
          <div>
            <FieldLabel required>Brand / Customer</FieldLabel>
            <Select
              showSearch
              value={form.customer || undefined}
              onChange={v => setField("customer", v)}
              placeholder="Select brand"
              style={{ width: "100%" }}
              dropdownMatchSelectWidth={false}
            >
              {CUSTOMERS.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </div>

          {/* Commodity */}
          <div>
            <FieldLabel required>Unit Type</FieldLabel>
            <Select
              value={form.commodity || undefined}
              onChange={v => setField("commodity", v)}
              placeholder="IDU / ODU / ..."
              style={{ width: "100%" }}
            >
              {COMMODITIES.map(c => {
                const col = COMMODITY_COLORS[c];
                return (
                  <Option key={c} value={c}>
                    <span style={{ fontWeight: 700, color: col?.color }}>{c}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>
                      {c === "IDU" ? "Indoor Unit" : c === "ODU" ? "Outdoor Unit" : c === "CBU" ? "Cassette" : "Window AC"}
                    </span>
                  </Option>
                );
              })}
            </Select>
          </div>

          {/* Production */}
          <div>
            <FieldLabel required>Units Produced</FieldLabel>
            <InputNumber
              value={form.production}
              onChange={v => setField("production", v)}
              min={0}
              placeholder="e.g. 12000"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={v => v.replace(/,/g, "")}
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* Field Complaint */}
          <div>
            <FieldLabel>Field Complaints</FieldLabel>
            <InputNumber
              value={form.fieldComplaint}
              onChange={v => setField("fieldComplaint", v || 0)}
              min={0}
              placeholder="0"
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* Warranty Complaint */}
          <div>
            <FieldLabel>Warranty Complaints</FieldLabel>
            <InputNumber
              value={form.warrantyComplaint}
              onChange={v => setField("warrantyComplaint", v || 0)}
              min={0}
              placeholder="0"
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

        </div>

        {/* Live PPM + Submit */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {form.production > 0 && (
            <PpmPreview production={form.production} warrantyComplaint={form.warrantyComplaint} />
          )}
          <div style={{ flex: 1 }} />
          <Button
            onClick={() => setForm({ customer: "", commodity: "", month: null, production: null, fieldComplaint: 0, warrantyComplaint: 0 })}
            icon={<ReloadOutlined />}
            style={{ borderRadius: 8, height: 38, fontWeight: 600, color: "#64748b", borderColor: "#e2e8f0" }}
          >
            Reset
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={submitting}
            disabled={!isFormValid}
            onClick={handleSubmit}
            style={{
              borderRadius: 8, height: 38, fontWeight: 700, fontSize: 13,
              background: isFormValid ? "#e53935" : undefined,
              borderColor: isFormValid ? "#e53935" : undefined,
              paddingInline: 24,
            }}
          >
            Add Production Entry
          </Button>
        </div>

        {/* Validation hints */}
        {!isFormValid && (form.customer || form.commodity || form.month || form.production) && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { ok: !!form.month,       label: "Month selected" },
              { ok: !!form.customer,    label: "Brand selected" },
              { ok: !!form.commodity,   label: "Unit type selected" },
              { ok: form.production > 0, label: "Production > 0" },
            ].map(item => (
              <span key={item.label} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                background: item.ok ? "#f0fdf4" : "#fff1f0",
                color: item.ok ? "#16a34a" : "#dc2626",
                border: `1px solid ${item.ok ? "#bbf7d0" : "#fecaca"}`,
                fontWeight: 600,
              }}>
                {item.ok ? "✓" : "✗"} {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Records Table ── */}
      <div style={{ borderRadius: 14, padding: "12px 4px 8px", background: "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>📊</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Monthly Production Records</span>
            {!loading && (
              <Tag color="blue" style={{ fontSize: 11, borderRadius: 5, marginLeft: 4 }}>{sortedRecords.length} records</Tag>
            )}
          </div>
          <Button size="small" icon={<ReloadOutlined />} onClick={refetch}
            style={{ borderRadius: 8, fontSize: 11, color: "#64748b", borderColor: "#e2e8f0" }}>
            Refresh
          </Button>
        </div>

        <div style={{
          borderRadius: 12,
          boxShadow: "0 6px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)",
          background: "#fff",
          overflow: "hidden",
        }}>
          <Table
            dataSource={sortedRecords}
            columns={columns}
            rowKey={r => r._id}
            size="small"
            loading={loading}
            className="pg-table"
            pagination={{
              pageSize: 15,
              showSizeChanger: false,
              showTotal: t => <span style={{ fontSize: 12, color: "#64748b" }}>{t} total entries</span>,
            }}
            scroll={{ x: 900 }}
            rowClassName={(r) => {
              const ppm = r.warrantyPPM || 0;
              if (ppm > 40000) return "pg-row-critical";
              if (ppm > 10000) return "pg-row-warning";
              return "";
            }}
          />
        </div>
      </div>

      {/* Row coloring styles */}
      <style>{`
        .pg-row-critical td { background: #fff5f5 !important; }
        .pg-row-warning td  { background: #fffbeb !important; }
        .ant-picker { border-radius: 8px !important; }
        .ant-input-number { border-radius: 8px !important; }
        .ant-select-selector { border-radius: 8px !important; }
      `}</style>
    </div>
  );
}