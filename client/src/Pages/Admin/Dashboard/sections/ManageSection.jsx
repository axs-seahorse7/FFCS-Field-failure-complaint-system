// sections/ManageSection.jsx
import { useState, useEffect, useCallback } from "react";
import { Input, Select, Table, Button, Space, Popconfirm, Tooltip } from "antd";
import { SearchOutlined, ReloadOutlined, DeleteOutlined } from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import DrilldownModal from "./DrilldownModal.jsx";
import api from "../../../../services/axios-interceptore/api";
import { useApiQuery } from "../components/useApiQuery.js";
import { fmtNum, fmtDate } from "../components/utils";

const { Option } = Select;
const STATUSES = ["Open","Active","Pending","Resolved","Closed"];

const STATUS_COLORS = {
  Open: "#3b82f6", Active: "#22c55e", Pending: "#f59e0b", Resolved: "#16a34a", Closed: "#94a3b8"
};

export default function ManageSection({ addToast }) {
  // const [data, setData]             = useState([]);
  // const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [custFilter, setCust]       = useState("");
  const [selected, setSelected]     = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const { data = [], loading, refetch } = useApiQuery(
    "/get-complaint",
    {},
    {
      onError: () => {
        addToast("Failed to load complaints", "error");
      }
    }
  );

  // const fetchData = useCallback(() => {
  //   setLoading(true);
  //   api.get("/get-complaint")
  //     .then(r => { setData(r.data?.complaints || r.data || []); setLoading(false); })
  //     .catch(() => { addToast("Failed to load complaints", "error"); setLoading(false); });
  // }, []);

  // useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.post("/complaints/status", { id, status });
      addToast(`Status updated to "${status}"`, "success");
      setData(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    } catch {
      addToast("Update failed", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteComplaint = async (id) => {
    try {
      await api.post("/complaints/delete", { id });
      addToast("Complaint deleted", "success");
      setData(prev => prev.filter(r => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch {
      addToast("Delete failed", "error");
    }
  };

  const list = Array.isArray(data)
    ? data
    : data?.complaints || [];

  const filtered = list.filter(r => {
    const q = search.toLowerCase();
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (custFilter   && r.customerName !== custFilter)   return false;
    return true;
  });

  // Status-wise counts
  const statusCounts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: list?.filter(r => r.status === s).length }), {});

  const columns = [
    { title: "#",            key: "idx",            width: 40,  render: (_, __, i) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{i + 1}</span> },
    { title: "Complaint No", dataIndex: "complaintNo",  key: "cno",  width: 135, render: v => <span style={{ color: "#2563eb", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}>{v || "—"}</span> },
    { title: "Date",         dataIndex: "complaintDate",key: "date", width: 100, render: v => <span style={{ fontFamily: "JetBrains Mono", fontSize: 13 }}>{fmtDate(v)}</span> },
    { title: "Customer",     dataIndex: "customerName", key: "cust", width: 95,  render: v => <b style={{ color: "#1e293b", fontSize: 13 }}>{v}</b> },
    { title: "Commodity",    dataIndex: "commodity",    key: "comm", width: 80,  render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: "Model",        dataIndex: "modelName",    key: "model",width: 140, ellipsis: true, render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: "Defect",       dataIndex: "defectDetails",key: "defect",ellipsis: true, render: v => (
      <Tooltip title={v}><span style={{ color: "#64748b", fontSize: 13 }}>{v}</span></Tooltip>
    )},
    { title: "Part",         dataIndex: "defectivePart",key: "part", width: 110, ellipsis: true, render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: "DOA",          dataIndex: "doa",          key: "doa",  width: 55,  render: v => <span style={{ fontSize: 13 }}>{v || "—"}</span> },
    { title: "Status",       dataIndex: "status",       key: "status",width: 105,render: v => <StatusBadge status={v} /> },
    {
      title: "Change Status", key: "changeStatus", width: 140, fixed: "right",
      render: (_, r) => (
        <Select
          value={r.status} size="small"
          loading={updatingId === r._id}
          onChange={v => updateStatus(r._id, v)}
          onClick={e => e.stopPropagation()}
          style={{ width: 120 }}
        >
          {STATUSES.map(s => <Option key={s}>{s}</Option>)}
        </Select>
      )
    },
    {
      title: "Actions", key: "actions", width: 64, fixed: "right",
      render: (_, r) => (
        <Popconfirm
          title="Delete this complaint?"
          description="This action cannot be undone."
          onConfirm={() => deleteComplaint(r._id)}
          okText="Delete" cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button
            size="small" danger icon={<DeleteOutlined />}
            onClick={e => e.stopPropagation()}
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#e53935", borderRadius: 8 }}
          />
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Status quick-filter pills */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {STATUSES.map(s => (
          <div key={s}
            onClick={() => setStatus(statusFilter === s ? "" : s)}
            style={{
              padding: "8px 18px", borderRadius: 10, cursor: "pointer",
              background: statusFilter === s ? `${STATUS_COLORS[s]}1a` : "#ffffff",
              border: `1.5px solid ${statusFilter === s ? STATUS_COLORS[s] : "#e8ecf0"}`,
              transition: "all 0.15s ease",
              boxShadow: statusFilter === s ? `0 0 0 3px ${STATUS_COLORS[s]}22` : "none",
            }}
          >
            <div style={{ color: STATUS_COLORS[s], fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{statusCounts[s]}</div>
            <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search complaints…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
          className="pg-input"
          allowClear
        />
        <Select value={custFilter || undefined} onChange={v => setCust(v || "")} allowClear placeholder="All Customers"
          style={{ minWidth: 150 }} className="pg-select">
          {["GODREJ","HAIER","AMSTRAD","ONIDA","CMI","MARQ","CROMA","BPL","HYUNDAI","SANSUI","VOLTAS","BLUE STAR"].map(c =>
            <Option key={c}>{c}</Option>)}
        </Select>
        <Select value={statusFilter || undefined} onChange={v => setStatus(v || "")} allowClear placeholder="All Status"
          style={{ minWidth: 140 }} className="pg-select">
          {STATUSES.map(s => <Option key={s}>{s}</Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={refetch} loading={loading}
          style={{ borderRadius: 10, borderColor: "#e2e8f0", color: "#64748b" }}>
          Refresh
        </Button>
      </div>

      <SectionCard title={`Manage Complaints (${fmtNum(filtered.length)})`} icon="⚙️">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey={r => r._id}
          size="middle"
          loading={loading}
          className="pg-table"
          pagination={{
            pageSize: 12, showSizeChanger: true,
            showTotal: t => <span style={{ color: "#64748b", fontSize: 13 }}>{fmtNum(t)} total</span>
          }}
          scroll={{ x: 1400 }}
          onRow={r => ({
            style: { cursor: "pointer" },
            onClick: () => setSelected(r),
          })}
        />
      </SectionCard>

      {/* Complaint detail popup */}
      {selected && (
        <DrilldownModal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Complaint — ${selected.complaintNo || "Detail"}`}
          subtitle={`${selected.customerName || ""} · ${fmtDate(selected.complaintDate)}`}
          data={selected}
          type="detail"
        />
      )}
    </div>
  );
}
