// sections/RegisterSection.jsx
import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Input, Select, Table, Tooltip, Button } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import DrilldownModal from "./DrilldownModal.jsx";
import { useApiQuery } from "../components/useApiQuery.js";
import { fmtNum, fmtDate } from "../components/utils";

const { Option } = Select;

export default function RegisterSection() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [search, setSearch] = useState("");
  const [custFilter, setCust] = useState("");
  const [catFilter, setCat] = useState("");
  const [selected, setSelected] = useState(null);

  const { filters, addToast } = useOutletContext();

    const { data, isLoading, refetch } = useApiQuery(
    "/get-complaints",
    {
      ...filters,
      page,
      limit: pageSize,
      search,
      customerName: custFilter || filters?.customerName,
      defectCategory: catFilter,
    },
    {
      onError: () => addToast("Failed to load register", "error"),
    }
  );

  const list = data?.complaints || [];
  const total = data?.total || 0;

  const columns = [
    { title: "S.No.", render: (_, __, i) => i + 1 + (page - 1) * pageSize },
    { title: "Complaint No", dataIndex: "complaintNo" },
    { title: "Date", dataIndex: "complaintDate", render: v => fmtDate(v) },
    { title: "Customer", dataIndex: "customerName" },
    { title: "Commodity", dataIndex: "commodity" },
    { title: "Model", dataIndex: "modelName", ellipsis: true },
    { title: "Category", dataIndex: "defectCategory", ellipsis: true },
    { title: "Part", dataIndex: "defectivePart", ellipsis: true },
    { title: "Defect Details", dataIndex: "defectDetails", ellipsis: true },
    { title: "DOA", dataIndex: "doa" },
    { title: "Status", dataIndex: "status", render: v => <StatusBadge status={v} /> },
  ];


  if (isLoading) return <SectionCard title="Complaint Register" icon="📋" loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Table */}
      <SectionCard title={`Complaint Register (${fmtNum(total)})`} icon="📋">
        <Table
          dataSource={list}
          columns={columns}
          rowKey={r => r._id}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
          }}
          onChange={(pagination) => {
            setPage(pagination.current);
            setPageSize(pagination.pageSize);
          }}
          scroll={{ x: 1200 }}
          onRow={r => ({
            onClick: () => setSelected(r),
          })}
        />
      </SectionCard>

      {/* Modal */}
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