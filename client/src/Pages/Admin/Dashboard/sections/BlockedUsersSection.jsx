// sections/BlockedUsersSection.jsx
import { useState, useEffect, useCallback } from "react";
import { Input, Table, Button, Popconfirm, Avatar, Space, Row, Col, Empty } from "antd";
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import KpiCard from "../components/KpiCard";
import api from "../../../../services/axios-interceptore/api";
import { fmtNum, fmtDate, fmtDT } from "../components/utils";

export default function BlockedUsersSection({ addToast }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get("/users", { params: { isBlocked: true } })
      .then(r => {
        const all = r.data?.users || r.data || [];
        setUsers(all.filter(u => u.isBlocked));
        setLoading(false);
      })
      .catch(() => { addToast("Failed to load blocked users", "error"); setLoading(false); });
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const unblockUser = async (id) => {
    try {
      await api.post("/users/unblock", { id });
      addToast("User unblocked successfully", "success");
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch { addToast("Failed to unblock", "error"); }
  };

  const deleteUser = async (id) => {
    try {
      await api.post("/users/delete", { id });
      addToast("User deleted", "success");
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch { addToast("Delete failed", "error"); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.email || "").toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q);
  });

  const columns = [
    {
      title: "#", key: "idx", width: 44,
      render: (_, __, i) => <span style={{ color: "#4a5568", fontFamily: "DM Mono" }}>{i + 1}</span>
    },
    {
      title: "User", key: "user",
      render: (_, u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={30}
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171", fontSize: 11, fontWeight: 700, flexShrink: 0
            }}>
            {(u.email || "U")[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 12 }}>{u.email}</div>
            <div style={{ color: "#4a5568", fontSize: 10, fontFamily: "DM Mono", marginTop: 1 }}>ID: {u._id}</div>
          </div>
        </div>
      )
    },
    {
      title: "Role", dataIndex: "role", key: "role", width: 90,
      render: v => (
        <span style={{
          display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 20,
          background: "rgba(100,116,139,0.15)", border: "1px solid rgba(100,116,139,0.3)",
          color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "capitalize"
        }}>{v || "user"}</span>
      )
    },
    {
      title: "Complaints", dataIndex: "complaintCount", key: "cc", width: 100,
      render: v => <span style={{ color: "#94a3b8", fontFamily: "DM Mono" }}>{fmtNum(v || 0)}</span>
    },
    {
      title: "Joined", dataIndex: "createdAt", key: "joined", width: 110,
      render: v => <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#64748b" }}>{fmtDate(v)}</span>
    },
    {
      title: "Blocked Since", dataIndex: "blockedAt", key: "blockedAt", width: 130,
      render: (v, u) => (
        <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#f87171" }}>
          {v ? fmtDT(v) : fmtDate(u.updatedAt) || "—"}
        </span>
      )
    },
    {
      title: "Status", key: "status", width: 90,
      render: () => (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 10px", borderRadius: 20,
          background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171", fontSize: 10, fontWeight: 700,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }} />
          Blocked
        </span>
      )
    },
    {
      title: "Actions", key: "actions", width: 160, fixed: "right",
      render: (_, u) => (
        <Space size={6} onClick={e => e.stopPropagation()}>
          <Popconfirm
            title="Unblock this user?"
            description="They will regain access to submit complaints."
            onConfirm={() => unblockUser(u._id)}
            okText="Unblock"
            okButtonProps={{ style: { background: "#10b981", borderColor: "#10b981" } }}
          >
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#34d399", borderRadius: 8, fontWeight: 600, fontSize: 11,
              }}
            >
              Unblock
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Delete user?"
            description="This action cannot be undone."
            onConfirm={() => deleteUser(u._id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171", borderRadius: 8,
              }}
            />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI row */}
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={6}>
          <KpiCard label="Total Blocked" value={users.length} color="red" icon="🚫" sub="Users blocked by admin" />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Spam Risk"
            value={users.filter(u => (u.complaintCount || 0) > 20).length}
            color="amber"
            icon="⚠️"
            sub="High complaint volume"
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Admins Blocked"
            value={users.filter(u => u.role === "admin").length}
            color="purple"
            icon="🔑"
            sub="Admin accounts blocked"
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Avg Complaints"
            value={users.length
              ? Math.round(users.reduce((s, u) => s + (u.complaintCount || 0), 0) / users.length)
              : 0}
            color="blue"
            icon="📋"
            sub="Per blocked user"
          />
        </Col>
      </Row>

      {/* Alert banner */}
      {users.length > 0 && (
        <div style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 12, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🚫</span>
          <div>
            <div style={{ color: "#f87171", fontWeight: 700, fontSize: 13 }}>
              {users.length} blocked {users.length === 1 ? "account" : "accounts"}
            </div>
            <div style={{ color: "#64748b", fontSize: 11 }}>
              These users cannot submit new complaints. Review and unblock if they were blocked in error.
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#4a5568" }} />}
          placeholder="Search blocked users by email or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240 }}
          className="pg-input"
          allowClear
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchUsers}
          loading={loading}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8", borderRadius: 10,
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Table */}
      <SectionCard title={`Blocked Users (${fmtNum(filtered.length)})`} icon="🚫">
        {!loading && users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ color: "#34d399", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No blocked users</div>
            <div style={{ color: "#4a5568", fontSize: 12 }}>All accounts are currently active.</div>
          </div>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey={u => u._id}
            size="small"
            loading={loading}
            className="pg-table"
            pagination={{
              pageSize: 12,
              showSizeChanger: true,
              showTotal: t => <span style={{ color: "#64748b" }}>{fmtNum(t)} total</span>
            }}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <div style={{ color: "#4a5568", padding: "40px 0", textAlign: "center" }}>
                  No blocked users match your search
                </div>
              )
            }}
          />
        )}
      </SectionCard>

      {/* Bottom hint */}
      <div style={{ color: "#334155", fontSize: 11, textAlign: "center", fontFamily: "DM Mono" }}>
        Blocked users are prevented from submitting new complaints · Only admins can unblock accounts
      </div>
    </div>
  );
}
