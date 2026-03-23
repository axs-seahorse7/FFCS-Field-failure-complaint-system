// sections/UsersSection.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Input, Select, Table, Button, Popconfirm, Avatar, Drawer,
  Space, Row, Col, Tag
} from "antd";
import {
  SearchOutlined, ReloadOutlined, StopOutlined,
  CheckCircleOutlined, DeleteOutlined
} from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import KpiCard from "../components/KpiCard";
import api from "../../../../services/axios-interceptore/api.js";
import { fmtNum, fmtDate, fmtDT } from "../components/utils";

const { Option } = Select;
const ROLES = ["admin", "user"];

const ROLE_STYLE = {
  admin: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", color: "#7c3aed" },
  user:  { bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)", color: "#64748b" },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.user;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 12px",
      borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 12, fontWeight: 700, textTransform: "capitalize",
    }}>
      {role || "user"}
    </span>
  );
}

export default function UsersSection({ addToast }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState("");
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawer] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get("/users")
      .then(r => { setUsers(r.data?.users || r.data || []); setLoading(false); })
      .catch(() => { addToast("Failed to load users", "error"); setLoading(false); });
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const blockUser = async (id, isBlocked) => {
    const action = isBlocked ? "unblock" : "block";
    try {
      await api.post(`/users/${action}`, { id });
      addToast(`User ${action}ed`, "success");
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: !isBlocked } : u));
      if (selected?._id === id) setSelected(s => ({ ...s, isBlocked: !isBlocked }));
    } catch { addToast(`Failed to ${action}`, "error"); }
  };

  const deleteUser = async (id) => {
    try {
      await api.post("/users/delete", { id });
      addToast("User deleted", "success");
      setUsers(prev => prev.filter(u => u._id !== id));
      if (selected?._id === id) { setDrawer(false); setSelected(null); }
    } catch { addToast("Delete failed", "error"); }
  };

  const changeRole = async (id, role) => {
    try {
      await api.post("/users/role", { id, role });
      addToast(`Role updated to "${role}"`, "success");
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role } : u));
    } catch { addToast("Role update failed", "error"); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (q && !`${u.email || ""} ${u.role || ""}`.toLowerCase().includes(q)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  const stats = {
    total:   users.length,
    active:  users.filter(u => !u.isBlocked).length,
    blocked: users.filter(u => u.isBlocked).length,
    admins:  users.filter(u => u.role === "admin").length,
  };

  const openDrawer = (u) => { setSelected(u); setDrawer(true); };

  const columns = [
    { title: "#", key: "idx", width: 44, render: (_, __, i) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{i + 1}</span> },
    {
      title: "User", key: "user",
      render: (_, u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={30} style={{
            background: u.isBlocked ? "rgba(239,68,68,0.12)" : "rgba(139,92,246,0.12)",
            color: u.isBlocked ? "#e53935" : "#7c3aed",
            fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${u.isBlocked ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.25)"}`,
          }}>
            {(u.email || "U")[0].toUpperCase()}
          </Avatar>
          <span style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{u.email}</span>
        </div>
      )
    },
    { title: "Role",       dataIndex: "role",           key: "role",   width: 95,  render: v => <RoleBadge role={v} /> },
    { title: "Complaints", dataIndex: "complaintCount", key: "cc",     width: 110,
      render: v => (
        <span style={{
          fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700,
          color: (v || 0) > 20 ? "#e53935" : "#1e293b",
        }}>
          {fmtNum(v || 0)}
        </span>
      )
    },
    { title: "Joined",     dataIndex: "createdAt",      key: "joined", width: 110, render: v => <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#64748b" }}>{fmtDate(v)}</span> },
    {
      title: "Status", key: "status", width: 100,
      render: (_, u) => u.isBlocked
        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 12px", borderRadius: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#e53935", fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#e53935" }} />Blocked
          </span>
        : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 12px", borderRadius: 20, background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", color: "#16a34a", fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a" }} />Active
          </span>
    },
    {
      title: "Change Role", key: "role_change", width: 130,
      render: (_, u) => (
        <Select value={u.role || "user"} size="small" onChange={v => changeRole(u._id, v)}
          onClick={e => e.stopPropagation()} style={{ width: 105 }}>
          {ROLES.map(r => <Option key={r} style={{ textTransform: "capitalize" }}>{r}</Option>)}
        </Select>
      )
    },
    {
      title: "Actions", key: "actions", width: 150, fixed: "right",
      render: (_, u) => (
        <Space size={6} onClick={e => e.stopPropagation()}>
          <Popconfirm
            title={u.isBlocked ? "Unblock this user?" : "Block this user?"}
            description={u.isBlocked ? "User will regain complaint access." : "User will lose complaint access."}
            onConfirm={() => blockUser(u._id, u.isBlocked)}
            okText="Confirm"
          >
            <Button size="small"
              icon={u.isBlocked ? <CheckCircleOutlined /> : <StopOutlined />}
              style={{
                background: u.isBlocked ? "rgba(22,163,74,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${u.isBlocked ? "rgba(22,163,74,0.25)" : "rgba(245,158,11,0.25)"}`,
                color: u.isBlocked ? "#16a34a" : "#d97706",
                borderRadius: 8, fontSize: 12, fontWeight: 600,
              }}>
              {u.isBlocked ? "Unblock" : "Block"}
            </Button>
          </Popconfirm>
          <Popconfirm title="Delete user?" description="This cannot be undone." onConfirm={() => deleteUser(u._id)} okText="Delete" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />}
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#e53935", borderRadius: 8 }} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPIs */}
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={6}><KpiCard label="Total Users"  value={stats.total}   color="blue"   icon="👥" /></Col>
        <Col xs={12} sm={6}><KpiCard label="Active"       value={stats.active}  color="green"  icon="✅" sub="Currently active" /></Col>
        <Col xs={12} sm={6}><KpiCard label="Blocked"      value={stats.blocked} color="red"    icon="🚫" sub="Access restricted" /></Col>
        <Col xs={12} sm={6}><KpiCard label="Admins"       value={stats.admins}  color="purple" icon="🔑" sub="Admin role users" /></Col>
      </Row>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search by email or role…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
          className="pg-input"
          allowClear
        />
        <Select value={roleFilter || undefined} onChange={v => setRole(v || "")} allowClear
          placeholder="All Roles" style={{ minWidth: 130 }} className="pg-select">
          {ROLES.map(r => <Option key={r} style={{ textTransform: "capitalize" }}>{r}</Option>)}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}
          style={{ borderRadius: 10, borderColor: "#e2e8f0", color: "#64748b" }}>
          Refresh
        </Button>
      </div>

      <SectionCard title={`Manage Users (${fmtNum(filtered.length)})`} icon="👥">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey={u => u._id}
          size="middle"
          loading={loading}
          className="pg-table"
          pagination={{
            pageSize: 12, showSizeChanger: true,
            showTotal: t => <span style={{ color: "#64748b", fontSize: 13 }}>{fmtNum(t)} total</span>
          }}
          scroll={{ x: 1050 }}
          onRow={u => ({
            style: { cursor: "pointer", opacity: u.isBlocked ? 0.75 : 1 },
            onClick: () => openDrawer(u),
          })}
        />
      </SectionCard>

      {/* User detail drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar size={38} style={{
              background: "rgba(139,92,246,0.12)", color: "#7c3aed",
              fontWeight: 700, fontSize: 14,
              border: "1.5px solid rgba(139,92,246,0.25)",
            }}>
              {(selected?.email || "U")[0].toUpperCase()}
            </Avatar>
            <div>
              <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 14 }}>{selected?.email}</div>
              <RoleBadge role={selected?.role} />
            </div>
          </div>
        }
        styles={{
          header: { background: "#fff", borderBottom: "1px solid #f0f2f5", paddingTop: 16, paddingBottom: 16 },
          body: { background: "#fff", padding: 20 },
        }}
        width={360}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Details */}
            {[
              ["User ID",    selected._id,           true],
              ["Email",      selected.email,          true],
              ["Role",       selected.role || "user", false],
              ["Status",     selected.isBlocked ? "Blocked" : "Active", false],
              ["Complaints", fmtNum(selected.complaintCount || 0), false],
              ["Joined",     fmtDT(selected.createdAt),  false],
            ].map(([label, value, mono]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: 8, padding: "11px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, flexShrink: 0 }}>
                  {label}
                </span>
                {label === "Status"
                  ? <StatusBadge status={value} />
                  : label === "Role"
                  ? <RoleBadge role={value} />
                  : <span style={{
                      color: mono ? "#2563eb" : "#1e293b",
                      fontFamily: mono ? "JetBrains Mono" : "inherit",
                      fontSize: mono ? 11 : 13,
                      fontWeight: 600, textAlign: "right", wordBreak: "break-all",
                    }}>{value}</span>
                }
              </div>
            ))}

            {/* Complaint volume indicator */}
            {(selected.complaintCount || 0) > 0 && (
              <div style={{ margin: "16px 0", padding: "12px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e8ecf0" }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>Complaint Volume</div>
                <div style={{ height: 8, borderRadius: 4, background: "#e8ecf0", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    width: `${Math.min(100, ((selected.complaintCount || 0) / 50) * 100)}%`,
                    background: (selected.complaintCount || 0) > 20 ? "#e53935" : "#16a34a",
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
                  {selected.complaintCount || 0} complaints logged
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <Popconfirm
                title={selected.isBlocked ? "Unblock this user?" : "Block this user?"}
                description={selected.isBlocked ? "User will regain access to submit complaints." : "User will lose access to submit complaints."}
                onConfirm={() => blockUser(selected._id, selected.isBlocked)}
                okText="Confirm"
              >
                <Button block style={{
                  background: selected.isBlocked ? "rgba(22,163,74,0.08)" : "rgba(245,158,11,0.08)",
                  border: `1.5px solid ${selected.isBlocked ? "rgba(22,163,74,0.3)" : "rgba(245,158,11,0.3)"}`,
                  color: selected.isBlocked ? "#16a34a" : "#d97706",
                  borderRadius: 10, fontWeight: 700, height: 42, fontSize: 13,
                }}>
                  {selected.isBlocked ? "✅  Unblock User" : "🚫  Block User"}
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Permanently delete this user?"
                description="This action cannot be undone."
                onConfirm={() => deleteUser(selected._id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button block danger style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1.5px solid rgba(239,68,68,0.2)",
                  color: "#e53935", borderRadius: 10, fontWeight: 700, height: 42, fontSize: 13,
                }}>
                  🗑  Delete User
                </Button>
              </Popconfirm>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
