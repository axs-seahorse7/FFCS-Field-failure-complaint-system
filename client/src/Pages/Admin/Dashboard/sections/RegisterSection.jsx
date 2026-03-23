// sections/RegisterSection.jsx
import { useState, useEffect, useCallback } from "react";
import { Input, Select, Table, Tooltip, Button } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import DrilldownModal from "./DrilldownModal.jsx";
import api from "../../../../services/axios-interceptore/api.js";
import { fmtNum, fmtDate } from "../components/utils";

const { Option } = Select;

export default function RegisterSection({ addToast }) {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [custFilter, setCust]   = useState("");
  const [catFilter, setCat]     = useState("");
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/get-complaint");
      setData(response.data?.complaints || response.data || []);
      setLoading(false);
    } catch (error) {
      addToast("Failed to load register", "error");
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);


  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    if (q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    if (custFilter && r.customerName !== custFilter) return false;
    if (catFilter  && r.defectCategory !== catFilter)  return false;
    return true;
  });

  const columns = [
    { title: "#",              key: "idx",             width: 44,  render: (_, __, i) => <span style={{ color: "#94a3b8", fontFamily: "JetBrains Mono", fontSize: 13 }}>{i + 1}</span> },
    { title: "Complaint No",   dataIndex: "complaintNo",  key: "cno",  width: 130, render: v => <span style={{ color: "#2563eb", fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}>{v || "—"}</span> },
    { title: "Date",           dataIndex: "complaintDate",key: "date", width: 100, render: v => <span style={{ fontFamily: "JetBrains Mono", fontSize: 13 }}>{fmtDate(v)}</span> },
    { title: "Customer",       dataIndex: "customerName", key: "customer", width: 100, render: v => <b style={{ color: "#1e293b", fontSize: 13 }}>{v}</b> },
    { title: "Commodity",      dataIndex: "commodity",    key: "commodity", width: 80,  render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: "Model",          dataIndex: "modelName",    key: "model", width: 140, ellipsis: true, render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: "Category",       dataIndex: "defectCategory",key: "cat",  width: 150, ellipsis: true, render: v => (
      <Tooltip title={v}><span style={{ color: "#475569", fontSize: 13 }}>{v}</span></Tooltip>
    )},
    { title: "Part",           dataIndex: "defectivePart",key: "part", width: 120, ellipsis: true, render: v => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: "Defect Details", dataIndex: "defectDetails",key: "details", ellipsis: true, render: v => (
      <Tooltip title={v}><span style={{ color: "#64748b", fontSize: 13 }}>{v}</span></Tooltip>
    )},
    { title: "DOA",            dataIndex: "doa",           key: "doa",  width: 60,  render: v => <span style={{ fontSize: 13 }}>{v || "—"}</span> },
    { title: "Status",         dataIndex: "status",        key: "status", width: 105, fixed: "right", render: v => <StatusBadge status={v} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search register…"
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
        <Select value={catFilter || undefined} onChange={v => setCat(v || "")} allowClear placeholder="All Categories"
          style={{ minWidth: 180 }} className="pg-select">
          {["ELEC PART DEFECTS","PART BROKEN / DAMAGED / MISSING","LEAK","NOISE","MISC DEFECT"].map(c =>
            <Option key={c}>{c}</Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}
          style={{ borderRadius: 10, borderColor: "#e2e8f0", color: "#64748b" }}>
          Refresh
        </Button>
      </div>

      <SectionCard title={`Complaint Register (${fmtNum(filtered.length)} records)`} icon="📋">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey={r => r._id || r.complaintNo}
          size="middle"
          loading={loading}
          className="pg-table"
          pagination={{
            pageSize: 15, showSizeChanger: true,
            showTotal: total => <span style={{ color: "#64748b", fontSize: 13 }}>{fmtNum(total)} total</span>
          }}
          scroll={{ x: 1200 }}
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
