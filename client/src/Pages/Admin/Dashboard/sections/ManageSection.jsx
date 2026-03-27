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
    {
      page,
      limit: pageSize,
      search,
      status: statusFilter,
      customerName: custFilter,
    },
    {
      onError: () => addToast("Failed to load complaints", "error"),
    }
  );

  const list = data?.complaints || [];
  const total = data?.total || 0;

  // ✅ Status counts (optional, lightweight)
  const statusCounts = STATUSES.reduce(
    (acc, s) => ({
      ...acc,
      [s]: list.filter(r => r.status === s).length
    }),
    {}
  );

  // 🔥 Update status
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

  // 🔥 Delete
  const deleteComplaint = async (id) => {
    try {
      await api.post("/complaints/delete", { id });
      addToast("Complaint deleted", "success");
      refetch(); // ✅ refresh data
      if (selected?._id === id) setSelected(null);
    } catch {
      addToast("Delete failed", "error");
    }
  };

  const columns = [
    {
      title: "#",
      render: (_, __, i) => i + 1 + (page - 1) * pageSize
    },
    { title: "Complaint No", dataIndex: "complaintNo" },
    { title: "Date", dataIndex: "complaintDate", render: v => fmtDate(v) },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Commodity", dataIndex: "commodity" },
    { title: "Model", dataIndex: "modelName", ellipsis: true },
    { title: "Defect", dataIndex: "defectDetails", ellipsis: true },
    { title: "Part", dataIndex: "defectivePart", ellipsis: true },
    { title: "DOA", dataIndex: "doa" },
    { title: "Status", dataIndex: "status", render: v => <StatusBadge status={v} /> },

    {
      title: "Change Status",
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
      title: "Actions",
      render: (_, r) => (
        <Popconfirm
          title="Delete this complaint?"
          onConfirm={() => deleteComplaint(r._id)}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={e => e.stopPropagation()}
          />
        </Popconfirm>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
        />

        <Select
          value={custFilter || undefined}
          onChange={v => {
            setCust(v || "");
            setPage(1);
          }}
          allowClear
          placeholder="Customer"
        >
          {["GODREJ","HAIER","AMSTRAD"].map(c => <Option key={c}>{c}</Option>)}
        </Select>

        <Select
          value={statusFilter || undefined}
          onChange={v => {
            setStatus(v || "");
            setPage(1);
          }}
          allowClear
          placeholder="Status"
        >
          {STATUSES.map(s => <Option key={s}>{s}</Option>)}
        </Select>

        <Button onClick={refetch} icon={<ReloadOutlined />}>
          Refresh
        </Button>
      </div>

      <SectionCard title={`Manage Complaints (${fmtNum(total)})`} icon="⚙️">
        <Table
          dataSource={list}
          columns={columns}
          rowKey={r => r._id}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
          }}
          onChange={(p) => {
            setPage(p.current);
            setPageSize(p.pageSize);
          }}
          scroll={{ x: 1400 }}
          onRow={r => ({
            onClick: () => setSelected(r),
          })}
        />
      </SectionCard>

      {/* Modal */}
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