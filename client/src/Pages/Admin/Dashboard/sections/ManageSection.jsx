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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("");
  const [custFilter, setCust] = useState("");
  const [selected, setSelected] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const { data, isLoading, refetch } = useApiQuery("/get-complaints",
    { page, limit: pageSize, search, status: statusFilter, customerName: custFilter },
    { onError: () => addToast("Failed to load complaints", "error") }
  );

  const list = data?.complaints || [];
  const total = data?.total || 0;

  // Use API-level counts if available, fallback to page-level count
  const statusCounts = data?.statusCounts ||
    STATUSES.reduce((acc, s) => ({ ...acc, [s]: list.filter(r => r.status === s).length }), {});

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.post("/complaints/status", { id, status });
      addToast(`Status updated to "${status}"`, "success");
      refetch();
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
      refetch();
      if (selected?._id === id) setSelected(null);
    } catch {
      addToast("Delete failed", "error");
    }
  };

  const columns = [
    { title: "#", width: 44, render: (_, __, i) => i + 1 + (page - 1) * pageSize },
    { title: "Complaint No", dataIndex: "complaintNo", width: 130 },
    { title: "Date", dataIndex: "complaintDate", width: 100, render: v => fmtDate(v) },
    { title: "Customer", dataIndex: "customerName", width: 110 },
    { title: "Commodity", dataIndex: "commodity", width: 110 },
    { title: "Model", dataIndex: "modelName", width: 120, ellipsis: true },
    { title: "Defect", dataIndex: "defectDetails", width: 140, ellipsis: true },
    { title: "Part", dataIndex: "defectivePart", width: 120, ellipsis: true },
    { title: "DOA", dataIndex: "doa", width: 60 },
    {
      title: "Status", dataIndex: "status", width: 100,
      render: v => <StatusBadge status={v} />
    },
    {
      title: "Change Status", width: 130,
      render: (_, r) => (
        <Select
          value={r.status}
          size="small"
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
      title: "Actions", width: 70,
      render: (_, r) => (
        <Popconfirm title="Delete this complaint?" onConfirm={() => deleteComplaint(r._id)}>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Status Pills Row ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* All pill */}
        <button
          onClick={() => { setStatus(""); setPage(1); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 20, cursor: "pointer",
            border: `1.5px solid ${!statusFilter ? "#1e293b" : "#e2e8f0"}`,
            background: !statusFilter ? "#1e293b" : "#f8fafc",
            color: !statusFilter ? "#fff" : "#64748b",
            fontWeight: 600, fontSize: 12, transition: "all 0.18s",
          }}
        >
          All
          <span style={{
            background: !statusFilter ? "rgba(255,255,255,0.2)" : "#e2e8f0",
            color: !statusFilter ? "#fff" : "#475569",
            borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
          }}>
            {fmtNum(total)}
          </span>
        </button>

        {/* Per-status pills */}
        {STATUSES.map(s => {
          const active = statusFilter === s;
          const color = STATUS_COLORS[s];
          const count = statusCounts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => { setStatus(active ? "" : s); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                border: `1.5px solid ${active ? color : "#e2e8f0"}`,
                background: active ? color : "#f8fafc",
                color: active ? "#fff" : "#64748b",
                fontWeight: 600, fontSize: 12, transition: "all 0.18s",
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: active ? "#fff" : color,
                flexShrink: 0,
              }} />
              {s}
              <span style={{
                background: active ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: active ? "#fff" : "#475569",
                borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters Row ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search complaint, model, part…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ flex: "1 1 200px", maxWidth: 300 }}
        />
        <Select
          value={custFilter || undefined}
          onChange={v => { setCust(v || ""); setPage(1); }}
          allowClear placeholder="Customer"
          style={{ width: 140 }}
        >
          {["GODREJ", "HAIER", "AMSTRAD"].map(c => <Option key={c}>{c}</Option>)}
        </Select>
        <Button onClick={refetch} icon={<ReloadOutlined />}>Refresh</Button>
      </div>

      {/* ── Table ── */}
      <SectionCard title={`Manage Complaints (${fmtNum(total)})`} icon="⚙️">
        <Table
          dataSource={list}
          columns={columns}
          rowKey={r => r._id}
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "12", "20", "50"],
            size: "small",
          }}
          onChange={p => { setPage(p.current); setPageSize(p.pageSize); }}
          scroll={{ x: 1200, y: 420 }}
          onRow={r => ({
            onClick: () => setSelected(r),
            style: { cursor: "pointer" },
          })}
        />
      </SectionCard>

      {selected && (
        <DrilldownModal
          open
          onClose={() => setSelected(null)}
          title={`Complaint — ${selected.complaintNo}`}
          subtitle={`${selected.customerName} · ${fmtDate(selected.complaintDate)}`}
          data={selected}
          type="detail"
        />
      )}
    </div>
  );
}