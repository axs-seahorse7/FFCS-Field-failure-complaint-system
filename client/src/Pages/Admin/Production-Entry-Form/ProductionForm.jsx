// sections/ProductionEntryForm.jsx
import { useState, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Select, DatePicker, InputNumber, Button, Table,
  Tag, Popconfirm, message, Tooltip, Divider, Segmented, notification,
} from "antd";
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined,
  CloseOutlined, ReloadOutlined, FolderOutlined, ToolOutlined,
  WarningOutlined, FallOutlined, BarChartOutlined, FilterOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useApiQuery } from "../Dashboard/components/useApiQuery.js";
import api from "../../../services/axios-interceptore/api.js";
import {useUser} from "../../../Global/Context/User-Context/UserContext.jsx";

const { Option } = Select;

/* ── Constants ── */
const CUSTOMERS = [
  "GODREJ","HAIER","AMSTRAD","ONIDA","CMI","MARQ","CROMA",
  "BPL","HYUNDAI","SANSUI","VOLTAS","BLUE STAR","SAMSUNG",
  "LG","WHIRLPOOL","DAIKIN","HITACHI","PANASONIC","CARRIER",
  "ACCERPURE",  "BLACK+DECKER", "TCL","CELLECOR","T-SERIES", 
  "INTEX", "HITACHI", "OTHER", "EXPORT",
];

const LOCATIONS = ["Bhiwadi", "Supa"];

/* ── Sticky offsets ── */
const KPI_TOP = 55;
const KPI_HEIGHT = 92;
const FILTER_TOP = KPI_HEIGHT;
const FILTER_HEIGHT = 56;
const TABLE_STICKY_OFFSET = FILTER_TOP + FILTER_HEIGHT;

/* ─────────────────────────────────────────
   CORE FORMULA  (universal, location-agnostic)
   Total Production = (IDU + ODU) / 2 + WAC
   Total Complaint  = Field + Warranty
   PPM              = (Warranty / Total) × 1,000,000
───────────────────────────────────────── */
function calcTotal(idu = 0, odu = 0, wac = 0) {
  return Math.round(((idu + odu) / 2) + wac);
}
function calcPPM(totalProduction, warrantyComplaints) {
  if (!totalProduction || totalProduction <= 0) return 0;
  return Math.round((warrantyComplaints / totalProduction) * 1_000_000);
}

/* ── Shared card style ── */
const CARD = {
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)",
  background: "#fff",
  padding: "20px 24px",
};

/* ── Field label ── */
const FL = ({ children, hint, required }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: "#64748b",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
  }}>
    {required && <span style={{ color: "#e53935", marginRight: 3 }}>*</span>}
    {children}
    {hint && (
      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, textTransform: "none", marginLeft: 5 }}>
        ({hint})
      </span>
    )}
  </div>
);

/* ── Read-only derived chip ── */
const Derived = ({ value, color, bg, border }) => (
  <div style={{
    height: 32, display: "flex", alignItems: "center", paddingInline: 14,
    borderRadius: 8, background: bg, border: `1px solid ${border}`,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 15,
    fontWeight: 900, color, letterSpacing: 0.5,
    userSelect: "none",
  }}>
    {value.toLocaleString()}
  </div>
);

/* ── Live PPM badge ── */
const PpmBadge = ({ ppm }) => {
  const color  = ppm > 40000 ? "#ef4444" : ppm > 10000 ? "#f59e0b" : "#22c55e";
  const bg     = ppm > 40000 ? "#fff1f0" : ppm > 10000 ? "#fffbeb" : "#f0fdf4";
  const border = ppm > 40000 ? "#fecaca" : ppm > 10000 ? "#fde68a" : "#bbf7d0";
  const label  = ppm > 40000 ? "Critical" : ppm > 10000 ? "High" : ppm > 0 ? "OK" : "—";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px", borderRadius: 10,
      background: "#f8fafc", border: "1px solid #e2e8f0",
    }}>
      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
        Warranty PPM
      </span>
      <span style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "monospace", letterSpacing: 1 }}>
        {ppm.toLocaleString()}
      </span>
      <span style={{
        fontSize: 10, padding: "2px 10px", borderRadius: 20,
        background: bg, color, border: `1px solid ${border}`, fontWeight: 700,
      }}>
        {label}
      </span>
    </div>
  );
};

/* ── Small optional tag ── */
const OptionalTag = () => (
  <span style={{
    fontSize: 9, fontWeight: 700, color: "#94a3b8",
    background: "#f1f5f9", border: "1px solid #e2e8f0",
    borderRadius: 4, padding: "1px 5px", marginLeft: 6,
    textTransform: "uppercase", letterSpacing: 0.5, verticalAlign: "middle",
  }}>
    optional
  </span>
);

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function ProductionEntryForm() {
  const { addToast, filters } = useOutletContext();

  const EMPTY = {
    month: null, location: "", customer: "",
    idu: 0, odu: 0, wac: 0,
    fieldComplaint: 0, warrantyComplaint: 0,
  };

  const RESET_FIELDS = {
    idu: 0, odu: 0, wac: 0,
    fieldComplaint: 0, warrantyComplaint: 0,
  };

  const [form,       setForm]       = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [editRow,    setEditRow]    = useState({});
  const [savingId,   setSavingId]   = useState(null);

  /* ── Table filters ── */
  const [filterMonth,    setFilterMonth]    = useState(null); // "YYYY-MM"
  const [filterCustomer, setFilterCustomer] = useState(null);
  const [filterLocation, setFilterLocation] = useState("All");

  const {user}      = useUser();
  const canEdit   = user.isSystemRole || user.roleId?.action?.includes("edit");
  const canDelete = user.isSystemRole || user.roleId?.action?.includes("delete");
  console.log("User :", user, "canEdit:", canEdit, "canDelete:", canDelete);

  /* ── API ── */
  const { data: records, loading, refetch } = useApiQuery(
    `/production/list?yearFrom=${dayjs().year() - 1}&yearTo=${dayjs().year()}`
  );

  const sortedRecords = useMemo(() =>
    [...(records || [])].sort((a, b) => new Date(b.month) - new Date(a.month))
  , [records]);

  /* ── Filter option lists (derived from data) ── */
  const monthOptions = useMemo(() => {
    const map = new Map();
    (records || []).forEach(r => {
      const key = dayjs(r.month).format("YYYY-MM");
      if (!map.has(key)) map.set(key, dayjs(r.month).format("MMM YYYY"));
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  const customerOptions = useMemo(() =>
    [...new Set((records || []).map(r => r.customer))].sort()
  , [records]);

  const hasActiveFilters = !!filterMonth || !!filterCustomer || filterLocation !== "All";

  const clearFilters = () => {
    setFilterMonth(null);
    setFilterCustomer(null);
    setFilterLocation("All");
  };

  const filteredRecords = useMemo(() => sortedRecords.filter(r => {
    if (filterMonth && dayjs(r.month).format("YYYY-MM") !== filterMonth) return false;
    if (filterCustomer && r.customer !== filterCustomer) return false;
    if (filterLocation !== "All" && r.location !== filterLocation) return false;
    return true;
  }), [sortedRecords, filterMonth, filterCustomer, filterLocation]);

  /* ── Live derived values ── */
  const totalProduction  = useMemo(() => calcTotal(form.idu, form.odu, form.wac), [form.idu, form.odu, form.wac]);
  const totalComplaint   = (form.fieldComplaint || 0) + (form.warrantyComplaint || 0);
  const livePPM          = calcPPM(totalProduction, form.warrantyComplaint || 0);

  const setField = useCallback((key, val) => setForm(f => ({ ...f, [key]: val ?? 0 })), []);

  const isFormValid = !!form.month && !!form.location && !!form.customer && totalProduction > 0;

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!isFormValid) { notification.warning({ message: "Validation Error", description: "Please fill all required fields." }); return; }
    setSubmitting(true);
    try {
      const date = form.month;
      const utcMonthStart = new Date(Date.UTC(
        date.year(),
        date.month(), // 0-based
        1
      ));

      await api.post("/production/create", {
        month: utcMonthStart,
        location: form.location,
        customer: form.customer,
        idu: form.idu || 0,
        odu: form.odu || 0,
        wac: form.wac || 0,
        fieldComplaint: form.fieldComplaint || 0,
        warrantyComplaint: form.warrantyComplaint || 0,
      });
      notification.success({
        message: "Production record saved",
        description: "Data saved successfully",
      });
      setForm(prev => ({
        ...prev,
        idu: 0,
        odu: 0,
        wac: 0,
        fieldComplaint: 0,
        warrantyComplaint: 0,
      }));
      refetch();
    } catch (err) {
      notification.error({
        message: "Failed to save",
        description: err?.response?.data?.message || "Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      await api.post("/production/delete", { id });
      notification.success({
        message: "Record deleted",
        description: "Data deleted successfully",
      });
      refetch();
    } catch (err) {
      notification.error({
        message: "Delete failed",
        description: err?.response?.data?.message || "Please try again."
      });
    }
  };

  
  const LOCATION_EDIT_DISABLED = user.isSystemAdmin;
  /* ── Inline edit ── */
  const startEdit = (r) => {
    setEditingId(r._id);
    setEditRow({
      location: r.location,
      idu: r.idu || 0, odu: r.odu || 0, wac: r.wac || 0,
      fieldComplaint: r.fieldComplaint || 0,
      warrantyComplaint: r.warrantyComplaint || 0,
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditRow({}); };
  
  const saveEdit   = async (id) => {
    const prod = calcTotal(editRow.idu, editRow.odu, editRow.wac);
    const tc   = (editRow.fieldComplaint || 0) + (editRow.warrantyComplaint || 0);
    setSavingId(id);
    try {
      await api.post("/production/update", {
        id, ...editRow,
        production: prod, totalComplaint: tc,
      });
      notification.success({
        message: "Production record updated",
        description: "Data saved successfully",
      });
      setEditingId(null);
      refetch();
    } catch (err) {
      notification.error({
        message: "Update failed",
        description: err?.response?.data?.message || "Could not save changes. Please try again.",
      });
    }
    finally { setSavingId(null); }
  };

  /* ── Summary KPIs ── */
  const summary = useMemo(() => {
    const arr = records || [];
    const totalProd = arr.reduce((s, r) => s + (r.production || 0), 0);
    const totalWarr = arr.reduce((s, r) => s + (r.warrantyComplaint || 0), 0);
    return {
      count: arr.length,
      totalProd,
      totalWarr,
      avgPpm: calcPPM(totalProd, totalWarr),
    };
  }, [records]);

  /* ── Table columns ── */
  const numCell = (v, color = "#1e293b") => (
    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color }}>
      {(v || 0).toLocaleString()}
    </span>
  );

  const editableNum = (key, r, color) => editingId === r._id ? (
    <InputNumber
      size="small" value={editRow[key]} min={0} style={{ width: 80 }}
      disabled={savingId === r._id}
      onChange={val => setEditRow(e => ({ ...e, [key]: val || 0 }))}
    />
  ) : numCell(r[key], color);

  const columns = [
    {
      title: "Month", dataIndex: "month", key: "month", width: 90,
      render: v => <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{dayjs(v).format("MMM YYYY")}</span>,
      sorter: (a, b) => new Date(a.month) - new Date(b.month),
    },
    {
      title: "Location", dataIndex: "location", key: "location", width: 110,
      render: (v, r) => editingId === r._id ? (
        <Select
          size="small"
          value={editRow.location}
          disabled={savingId === r._id || LOCATION_EDIT_DISABLED}
          style={{ width: 95 }}
          onChange={val => setEditRow(e => ({ ...e, location: val }))}
        >
          {LOCATIONS.map(l => <Option key={l} value={l}>{l}</Option>)}
        </Select>
      ) : (
        <Tag style={{
          borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: v === "Bhiwadi" ? "#eff6ff" : "#f0fdf4",
          color:       v === "Bhiwadi" ? "#3b82f6" : "#16a34a",
          borderColor: v === "Bhiwadi" ? "#bfdbfe" : "#bbf7d0",
        }}>{v}</Tag>
      ),
    },
    {
      title: "Brand", dataIndex: "customer", key: "customer", width: 100,
      render: v => <b style={{ fontSize: 12, color: "#1e293b" }}>{v}</b>,
    },
    {
      title: "IDU", dataIndex: "idu", key: "idu", width: 75,
      render: (v, r) => editableNum("idu", r, "#64748b"),
    },
    {
      title: "ODU", dataIndex: "odu", key: "odu", width: 75,
      render: (v, r) => editableNum("odu", r, "#64748b"),
    },
    {
      title: "WAC", dataIndex: "wac", key: "wac", width: 75,
      render: (v, r) => editableNum("wac", r, "#7c3aed"),
    },
    {
      title: "Total Prod.", dataIndex: "production", key: "production", width: 100,
      render: (v, r) => {
        const val = editingId === r._id
          ? calcTotal(editRow.idu, editRow.odu, editRow.wac)
          : (v || 0);
        return <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 900, color: "#0284c7" }}>{val.toLocaleString()}</span>;
      },
      sorter: (a, b) => (a.production || 0) - (b.production || 0),
    },
    {
      title: "Field Comp.", dataIndex: "fieldComplaint", key: "fc", width: 100,
      render: (v, r) => editableNum("fieldComplaint", r, "#475569"),
    },
    {
      title: "Warranty Comp.", dataIndex: "warrantyComplaint", key: "wc", width: 115,
      render: (v, r) => editableNum("warrantyComplaint", r, "#e53935"),
    },
    {
      title: "Total Comp.", key: "tc", width: 100,
      render: (_, r) => {
        const val = editingId === r._id
          ? (editRow.fieldComplaint || 0) + (editRow.warrantyComplaint || 0)
          : (r.totalComplaint || (r.fieldComplaint || 0) + (r.warrantyComplaint || 0));
        return numCell(val, "#d97706");
      },
    },
    {
      title: "PPM", key: "ppm", width: 90,
      render: (_, r) => {
        const prod = editingId === r._id ? calcTotal(editRow.idu, editRow.odu, editRow.wac) : (r.production || 0);
        const wc   = editingId === r._id ? (editRow.warrantyComplaint || 0) : (r.warrantyComplaint || 0);
        const ppm  = calcPPM(prod, wc);
        const color = ppm > 40000 ? "#ef4444" : ppm > 10000 ? "#f59e0b" : "#22c55e";
        return <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 900, color }}>{ppm.toLocaleString()}</span>;
      },
      sorter: (a, b) => calcPPM(a.production, a.warrantyComplaint) - calcPPM(b.production, b.warrantyComplaint),
    },
    {
      title: "Actions", key: "actions", width: 105, fixed: "right",
      render: (_, r) => editingId === r._id ? (
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            type="primary" size="small"
            icon={savingId === r._id ? null : <SaveOutlined />}
            loading={savingId === r._id}
            onClick={() => saveEdit(r._id)}
            style={{ background: "#22c55e", borderColor: "#22c55e", borderRadius: 6, fontSize: 11 }}>
            Save
          </Button>
          <Button
            size="small" icon={<CloseOutlined />} onClick={cancelEdit}
            disabled={savingId === r._id}
            style={{ borderRadius: 6, fontSize: 11 }}>
            Cancel
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 4 }}>
          {canEdit && (
            <Tooltip title="Edit">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => startEdit(r)} style={{ color: "#3b82f6" }} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm title="Delete this record?" okText="Delete" okType="danger" onConfirm={() => handleDelete(r._id)}>
              <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: "#ef4444" }} />
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];  

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>

      {/* ── KPI Strip (sticky) ── */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        position: "sticky", top: KPI_TOP, zIndex: 30,
        background: "#f8fafc", paddingBottom: 6,
      }}>
        {[
          { label: "Total Records",        value: summary.count.toLocaleString(),     icon: <FolderOutlined />,  color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Total Units Produced", value: summary.totalProd.toLocaleString(), icon: <ToolOutlined />,    color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
          { label: "Warranty Complaints",  value: summary.totalWarr.toLocaleString(), icon: <WarningOutlined />, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          {
            label: "Avg Warranty PPM", value: summary.avgPpm.toLocaleString(), icon: <FallOutlined />,
            color:  summary.avgPpm > 10000 ? "#ef4444" : "#16a34a",
            bg:     summary.avgPpm > 10000 ? "#fff1f0" : "#f0fdf4",
            border: summary.avgPpm > 10000 ? "#fecaca" : "#bbf7d0",
          },
        ].map(k => (
          <div key={k.label} style={{ flex: "1 1 160px", minWidth: 155 }}>
            <div style={{
              background: "#fff", border: `1px solid ${k.border}`, borderRadius: 10,
              padding: "10px 14px", height: 82, display: "flex", alignItems: "center", gap: 10,
              // boxShadow: "0 4px 16px rgba(0,0,0,0.07)", 
              transition: "box-shadow 0.2s, transform 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: k.color, flexShrink: 0 }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontFamily: "monospace", lineHeight: 1.2 }}>{k.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Entry Form ── */}
      <div style={CARD}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #f0f2f5" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff1f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#e53935" }}><ToolOutlined /></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>Add Production Entry</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Formula: <span style={{ fontFamily: "monospace", color: "#0284c7", fontWeight: 700 }}>(IDU + ODU) / 2 + WAC = Total Production</span>
            </div>
          </div>
        </div>

        {/* ── Row 1: Required identifiers ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div>
            <FL required>Month & Year</FL>
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
          <div>
            <FL required>Location</FL>
            <Select
              value={form.location || undefined}
              onChange={v => setField("location", v)}
              placeholder="Select location"
              style={{ width: "100%" }}
            >
              {LOCATIONS.map(l => (
                <Option key={l} value={l}>
                  <span style={{ fontWeight: 700 }}>{l}</span>
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <FL required>Brand / Customer</FL>
            <Select
              showSearch
              value={form.customer || undefined}
              onChange={v => setField("customer", v)}
              placeholder="Select brand"
              style={{ width: "100%" }}
              dropdownMatchSelectWidth={false}
            >
              {CUSTOMERS.map(c => <Option key={c+Math.random()} value={c}>{c}</Option>)}
            </Select>
          </div>
        </div>

        {/* ── Row 2: Production inputs ── */}
        <Divider style={{ margin: "0 0 18px", borderColor: "#f0f2f5" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Production Quantities
          </span>
        </Divider>

        {/* Formula visual */}
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          marginBottom: 18, padding: "10px 16px",
          borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd",
          flexWrap: "wrap", rowGap: 8,
        }}>
          {[
            { label: "( IDU",  color: "#0284c7" },
            { label: "+",      color: "#64748b", small: true },
            { label: "ODU )",  color: "#0284c7" },
            { label: "÷ 2",    color: "#64748b", small: true },
            { label: "+",      color: "#64748b", small: true },
            { label: "WAC",    color: "#7c3aed" },
            { label: "=",      color: "#64748b", small: true },
            { label: "Total Production", color: "#16a34a" },
          ].map((t, i) => (
            <span key={i} style={{
              fontSize: t.small ? 13 : 14, fontWeight: t.small ? 500 : 800,
              color: t.color, fontFamily: "monospace",
              padding: t.small ? "0 6px" : "0 8px",
            }}>
              {t.label}
            </span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
            IDU &amp; ODU are optional — enter 0 if not applicable
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 20 }}>

          {/* IDU */}
          <div style={{ flex: "1 1 130px", minWidth: 120 }}>
            <FL hint="Indoor Units">IDU <OptionalTag /></FL>
            <InputNumber
              value={form.idu || null}
              onChange={v => setField("idu", v || 0)}
              min={0} placeholder="0"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={v => v.replace(/,/g, "")}
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* ODU */}
          <div style={{ flex: "1 1 130px", minWidth: 120 }}>
            <FL hint="Outdoor Units">ODU <OptionalTag /></FL>
            <InputNumber
              value={form.odu || null}
              onChange={v => setField("odu", v || 0)}
              min={0} placeholder="0"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={v => v.replace(/,/g, "")}
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* WAC */}
          <div style={{ flex: "1 1 130px", minWidth: 120 }}>
            <FL hint="Window AC">WAC <OptionalTag /></FL>
            <InputNumber
              value={form.wac || null}
              onChange={v => setField("wac", v || 0)}
              min={0} placeholder="0"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={v => v.replace(/,/g, "")}
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* Separator */}
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
            <span style={{ fontSize: 22, color: "#cbd5e1", fontWeight: 300 }}>=</span>
          </div>

          {/* Total Production — auto */}
          <div style={{ flex: "1 1 130px", minWidth: 130 }}>
            <FL>Total Production <span style={{ fontSize: 9, color: "#16a34a", fontWeight: 700, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "1px 5px", marginLeft: 4, textTransform: "uppercase" }}>CBU</span></FL>
            <Derived
              value={totalProduction}
              color="#16a34a" bg="#f0fdf4" border="#86efac"
            />
          </div>
        </div>

        {/* ── Row 3: Complaints ── */}
        <Divider style={{ margin: "0 0 18px", borderColor: "#f0f2f5" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            Complaints
          </span>
        </Divider>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>

          {/* Field Complaint */}
          <div style={{ flex: "1 1 140px", minWidth: 130 }}>
            <FL>Field Complaints</FL>
            <InputNumber
              value={form.fieldComplaint || null}
              onChange={v => setField("fieldComplaint", v || 0)}
              min={0} placeholder="0"
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* Warranty Complaint */}
          <div style={{ flex: "1 1 140px", minWidth: 130 }}>
            <FL>Warranty Complaints</FL>
            <InputNumber
              value={form.warrantyComplaint || null}
              onChange={v => setField("warrantyComplaint", v || 0)}
              min={0} placeholder="0"
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>

          {/* Separator */}
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
            <span style={{ fontSize: 22, color: "#cbd5e1", fontWeight: 300 }}>=</span>
          </div>

          {/* Total Complaint — auto */}
          <div style={{ flex: "1 1 130px", minWidth: 130 }}>
            <FL>Total Complaints <span style={{ fontSize: 9, color: "#d97706", fontWeight: 700, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "1px 5px", marginLeft: 4, textTransform: "uppercase" }}>auto</span></FL>
            <Derived
              value={totalComplaint}
              color="#d97706" bg="#fffbeb" border="#fde68a"
            />
          </div>

          {/* Live PPM */}
          {totalProduction > 0 && (
            <div style={{ flex: "1 1 200px", display: "flex", alignItems: "flex-end" }}>
              <PpmBadge ppm={livePPM} />
            </div>
          )}
        </div>

        {/* ── Submit row ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid #f0f2f5" }}>
          <Button onClick={() => setForm(EMPTY)} icon={<ReloadOutlined />}
            style={{ borderRadius: 8, height: 38, fontWeight: 600, color: "#64748b", borderColor: "#e2e8f0" }}>
            Reset
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={submitting}
            disabled={!isFormValid}
            onClick={handleSubmit}
            style={{
              borderRadius: 8, height: 38, fontWeight: 700, fontSize: 13, paddingInline: 24,
              background: isFormValid ? "#e53935" : undefined,
              borderColor: isFormValid ? "#e53935" : undefined,
            }}
          >
            Add Production Entry
          </Button>
        </div>

        {/* Validation hints */}
        

        {!isFormValid && (form.location || form.customer || form.month || totalProduction > 0) && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { ok: !!form.month,        label: "Month selected" },
              { ok: !!form.location,     label: "Location selected" },
              { ok: !!form.customer,     label: "Brand selected" },
              { ok: totalProduction > 0, label: "Production > 0" },
            ].map(item => (
              <span key={item.label} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                background: item.ok ? "#f0fdf4" : "#fff1f0",
                color:      item.ok ? "#16a34a" : "#dc2626",
                border: `1px solid ${item.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>
                {item.ok ? "✓" : "✗"} {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BarChartOutlined style={{ fontSize: 15, color: "#1e293b" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Monthly Production Records</span>
          {!loading && (
            <Tag color="blue" style={{ fontSize: 11, borderRadius: 5, marginLeft: 4 }}>{filteredRecords.length} records</Tag>
          )}
        </div>
      </div>

      {/* ── Filter Bar (sticky) ── */}
      <div style={{
        position: "sticky", top: TABLE_STICKY_OFFSET - 15, zIndex: 29,
        background: "#fff", borderRadius: 10,
        // boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
          <FilterOutlined /> Filters
        </span>

        <Select
          allowClear
          placeholder="All Months"
          value={filterMonth || undefined}
          onChange={v => setFilterMonth(v || null)}
          style={{ width: 140 }}
          size="small"
        >
          {monthOptions.map(([key, label]) => <Option key={key} value={key}>{label}</Option>)}
        </Select>

        <Select
          allowClear
          showSearch
          placeholder="All Brands"
          value={filterCustomer || undefined}
          onChange={v => setFilterCustomer(v || null)}
          style={{ width: 160 }}
          size="small"
          dropdownMatchSelectWidth={false}
        >
          {customerOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
        </Select>

        <Segmented
          size="small"
          value={filterLocation}
          onChange={setFilterLocation}
          options={["All", ...LOCATIONS]}
        />

        {hasActiveFilters && (
          <Button
            size="small" type="text" icon={<ClearOutlined />}
            onClick={clearFilters}
            style={{ color: "#ef4444", fontSize: 11 }}
          >
            Clear
          </Button>
        )}

        <Button size="small" type="default" loading={loading} icon={<ReloadOutlined />} onClick={refetch}
            style={{ borderRadius: 8, fontSize: 11, }}>
            Refresh
        </Button>
      </div>

      {/* ── Records Table ── */}
      <div>
          <Table
            dataSource={filteredRecords}
            columns={columns}
            rowKey={r => r._id}
            size="small"
            loading={loading}
            className="pg-table"
            sticky={{
              offsetHeader: TABLE_STICKY_OFFSET + 25,
              getContainer: () => window, // force window as the scroll reference, not nearest div
            }}
            pagination={{
              pageSize: 15, showSizeChanger: false,
              showTotal: t => <span style={{ fontSize: 12, color: "#64748b" }}>{t} total entries</span>,
            }}
            scroll={{ x: 1100 }}
            rowClassName={r => {
              const ppm = calcPPM(r.production, r.warrantyComplaint);
              return ppm > 40000 ? "pg-row-critical" : ppm > 10000 ? "pg-row-warning" : "";
            }}
          />

      </div>

      <style>{`
        .pg-row-critical td { background: #fff5f5 !important; }
        .pg-row-warning  td { background: #fffbeb !important; }
        .ant-picker          { border-radius: 8px !important; }
        .ant-input-number    { border-radius: 8px !important; }
        .ant-select-selector { border-radius: 8px !important; }

        .pg-table .ant-table-thead > tr > th {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        /* Keep the fixed Actions column visible and above the sticky shadow layer */
        .pg-table .ant-table-cell-fix-right {
          background: #fff !important;
          z-index: 21 !important;
        }
        .pg-table .ant-table-thead .ant-table-cell-fix-right {
          background: #fafafa !important;
          z-index: 22 !important;
        }
      `}</style>
    </div>
  );
}