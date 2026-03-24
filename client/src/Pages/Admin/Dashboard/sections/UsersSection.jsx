// sections/UsersSection.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Input, Select, Table, Button, Popconfirm, Avatar, Drawer,
  Space, Row, Col, Modal, Progress,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, StopOutlined,
  CheckCircleOutlined, DeleteOutlined, LockOutlined,
} from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import KpiCard from "../components/KpiCard";
import api from "../../../../services/axios-interceptore/api.js";
import { fmtNum, fmtDate, fmtDT } from "../components/utils";

const { Option } = Select;
const ROLES = ["admin", "user"];

// ── Style maps ────────────────────────────────────────────────────────────────
const ROLE_STYLE = {
  admin: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",  color: "#7c3aed" },
  user:  { bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)", color: "#64748b" },
};

const STATUS_STYLE = {
  active:    { bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.25)",  color: "#16a34a", dot: "#16a34a" },
  pending:   { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", color: "#d97706", dot: "#f59e0b" },
  suspended: { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)",  color: "#e53935", dot: "#e53935" },
};

// Which statuses an admin can transition to from the current one
const NEXT_STATUSES = {
  pending:   ["active", "suspended"],
  active:    [ "suspended"],
  suspended: ["active",],
};

// ── Small reusable components ─────────────────────────────────────────────────
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

/** Clickable status tag. Disabled (visually only) when isBlocked. */
function StatusTag({ status, isBlocked, onClick }) {
  const key = isBlocked ? "suspended" : (status || "active");
  const s   = STATUS_STYLE[key] || STATUS_STYLE.active;
  const label = isBlocked
    ? "Blocked"
    : status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Active";

  return (
    <span
      onClick={!isBlocked && onClick ? onClick : undefined}
      title={isBlocked ? "Unblock user first to change status" : "Click to change status"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 12px", borderRadius: 20,
        background: isBlocked ? "rgba(239,68,68,0.10)" : s.bg,
        border: `1px solid ${isBlocked ? "rgba(239,68,68,0.25)" : s.border}`,
        color: isBlocked ? "#e53935" : s.color,
        fontSize: 12, fontWeight: 700,
        cursor: isBlocked || !onClick ? "default" : "pointer",
        userSelect: "none",
        transition: "opacity 0.15s",
        opacity: 1,
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
        background: isBlocked ? "#e53935" : s.dot,
      }} />
      {label}
    </span>
  );
}

// ── Password modal for role change ────────────────────────────────────────────
function RoleChangeModal({ open, targetUser, newRole, onConfirm, onCancel, loading }) {
  const [password, setPassword] = useState("");

  const submit = () => {
    if (!password.trim()) return;
    onConfirm(password);
    setPassword("");
  };

  const cancel = () => {
    setPassword("");
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔐</span>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>Confirm Role Change</span>
        </div>
      }
      onOk={submit}
      onCancel={cancel}
      okText="Confirm Change"
      cancelText="Cancel"
      confirmLoading={loading}
      okButtonProps={{ disabled: !password.trim() }}
      width={400}
      destroyOnClose
    >
      <div style={{ padding: "8px 0 4px" }}>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16, lineHeight: 1.65 }}>
          Changing <strong style={{ color: "#1e293b" }}>{targetUser?.email}</strong>'s
          role to <RoleBadge role={newRole} />. Enter your admin password to confirm.
        </p>
        <Input.Password
          prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onPressEnter={submit}
          autoFocus
          size="large"
          style={{ borderRadius: 10 }}
        />
      </div>
    </Modal>
  );
}

// ── Status cell with inline popconfirm ───────────────────────────────────────
function StatusCell({ user, onStatusChange }) {
  const [open, setOpen]       = useState(false);
  const [nextStatus, setNext] = useState(null);

  const options = NEXT_STATUSES[user.status] || [];

  const handleTagClick = (e) => {
    e.stopPropagation();
    if (user.isBlocked || options.length === 0) return;
    setNext(options[0]);
    setOpen(true);
  };

  const handleConfirm = (e) => {
    e?.stopPropagation();
    onStatusChange(user._id, nextStatus);
    setOpen(false);
  };

  const handleCancel = (e) => {
    e?.stopPropagation();
    setOpen(false);
  };

  return (
    <Popconfirm
      open={open}
      title={`Change status to "${nextStatus}"?`}
      description={
        options.length > 1 ? (
          <div>
            <p style={{ marginBottom: 8 }}>
              Move <strong>{user.email}</strong> from <em>{user.status}</em> to:
            </p>
            <Select
              size="small"
              value={nextStatus}
              onClick={e => e.stopPropagation()}
              onChange={v => setNext(v)}
              style={{ width: "100%" }}
            >
              {options.map(s => (
                <Option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</Option>
              ))}
            </Select>
          </div>
        ) : `Move ${user.email} from "${user.status}" → "${nextStatus}"?`
      }
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      okText="Change Status"
      cancelText="Cancel"
      placement="bottom"
    >
      <span onClick={e => e.stopPropagation()}>
        <StatusTag
          status={user.status}
          isBlocked={user.isBlocked}
          onClick={handleTagClick}
        />
      </span>
    </Popconfirm>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UsersSection({ addToast }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRole]     = useState("");
  const [selected, setSelected]   = useState(null);
  const [drawerOpen, setDrawer]   = useState(false);

  // Role-change modal
  const [roleModal, setRoleModal]     = useState(false);
  const [roleTarget, setRoleTarget]   = useState(null); // { user, newRole }
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchUsers = useCallback(() => {
  setLoading(true);

  api.get("/users")
    .then(r => {
      const users = r.data?.users || [];

      const filteredUsers = users
        .filter(u => !u.isSystemRole) // ❌ remove system roles
        .map(u => ({ ...u, role: u.role || "user" }));

      setUsers(filteredUsers);
      setLoading(false);
    })
    .catch(() => {
      addToast("Failed to load users", "error");
      setLoading(false);
    });

}, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Actions ──────────────────────────────────────────────────────────────
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

  const changeStatus = async (id, status) => {
    try {
      await api.post("/users/status", { id, status });
      addToast(`Status changed to "${status}"`, "success");
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status } : u));
      if (selected?._id === id) setSelected(s => ({ ...s, status }));
    } catch { addToast("Status update failed", "error"); }
  };

  // Opens password modal
  const initiateRoleChange = (user, newRole) => {
    if (user.role === newRole) return;
    setRoleTarget({ user, newRole });
    setRoleModal(true);
  };

  // Called after admin submits password
  const confirmRoleChange = async (password) => {
    if (!roleTarget) return;
    const { user, newRole } = roleTarget;
    setRoleLoading(true);
    try {
      await api.post("/users/role", { id: user._id, role: newRole, password });
      addToast(`Role updated to "${newRole}"`, "success");
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: newRole } : u));
      if (selected?._id === user._id) setSelected(s => ({ ...s, role: newRole }));
      setRoleModal(false);
      setRoleTarget(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "Role update failed — check your password";
      addToast(msg, "error");
    } finally {
      setRoleLoading(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (q && !`${u.email || ""} ${u.role || ""}`.toLowerCase().includes(q)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  const kpi = {
    total:     users.length,
    active:    users.filter(u => !u.isBlocked && u.status === "active").length,
    blocked:   users.filter(u => u.isBlocked).length,
    pending:   users.filter(u => !u.isBlocked && u.status === "pending").length,
    admins:    users.filter(u => u.role === "admin").length,
  };

  const openDrawer = (u) => { setSelected(u); setDrawer(true); };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: "#", key: "idx", width: 44,
      render: (_, __, i) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{i + 1}</span>,
    },
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
      ),
    },
    {
      title: "Role", dataIndex: "role", key: "role", width: 95,
      render: v => <RoleBadge role={v} />,
    },
    {
      title: "Complaints", dataIndex: "complaintCount", key: "cc", width: 110,
      render: v => (
        <span style={{
          fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700,
          color: (v || 0) > 20 ? "#e53935" : "#1e293b",
        }}>
          {fmtNum(v || 0)}
        </span>
      ),
    },
    {
      title: "Joined", dataIndex: "createdAt", key: "joined", width: 110,
      render: v => <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#64748b" }}>{fmtDate(v)}</span>,
    },
    {
      title: "Status", key: "status", width: 130,
      render: (_, u) => <StatusCell user={u} onStatusChange={changeStatus} />,
    },
    {
      title: "Change Role", key: "role_change", width: 140,
      render: (_, u) => (
        <Select
          value={u.role || "user"}
          size="small"
          onChange={v => initiateRoleChange(u, v)}
          onClick={e => e.stopPropagation()}   // ← stop row click
          disabled={u.isBlocked}
          style={{ width: 110 }}
        >
          {ROLES.map(r => <Option key={r} style={{ textTransform: "capitalize" }}>{r}</Option>)}
        </Select>
      ),
    },
    {
      title: "Actions", key: "actions", width: 160, fixed: "right",
      render: (_, u) => (
        <Space size={6} onClick={e => e.stopPropagation()}>  {/* ← stop row click */}
          <Popconfirm
            title={u.isBlocked ? "Unblock this user?" : "Block this user?"}
            description={u.isBlocked ? "User will regain complaint access." : "User will lose complaint access."}
            onConfirm={() => blockUser(u._id, u.isBlocked)}
            okText="Confirm"
          >
            <Button
              size="small"
              icon={u.isBlocked ? <CheckCircleOutlined /> : <StopOutlined />}
              style={{
                background: u.isBlocked ? "rgba(22,163,74,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${u.isBlocked ? "rgba(22,163,74,0.25)" : "rgba(245,158,11,0.25)"}`,
                color: u.isBlocked ? "#16a34a" : "#d97706",
                borderRadius: 8, fontSize: 12, fontWeight: 600,
              }}
            >
              {u.isBlocked ? "Unblock" : "Block"}
            </Button>
          </Popconfirm>

          <Popconfirm
            title="Delete user?"
            description="This cannot be undone."
            onConfirm={() => deleteUser(u._id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small" danger icon={<DeleteOutlined />}
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#e53935", borderRadius: 8,
              }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPIs */}
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={6}><KpiCard label="Total Users" value={kpi.total}   color="blue"   icon="👥" /></Col>
        <Col xs={12} sm={6}><KpiCard label="Active"      value={kpi.active}  color="green"  icon="✅" sub="Currently active" /></Col>
        <Col xs={12} sm={6}><KpiCard label="Blocked"     value={kpi.blocked} color="red"    icon="🚫" sub="Access restricted" /></Col>
        <Col xs={12} sm={6}><KpiCard label="Admins"      value={kpi.admins}  color="purple" icon="🔑" sub="Admin role users" /></Col>
      </Row>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search by email or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
          className="pg-input"
          allowClear
        />
        <Select
          value={roleFilter || undefined}
          onChange={v => setRole(v || "")}
          allowClear
          placeholder="All Roles"
          style={{ minWidth: 130 }}
          className="pg-select"
        >
          {ROLES.map(r => <Option key={r} style={{ textTransform: "capitalize" }}>{r}</Option>)}
        </Select>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchUsers}
          loading={loading}
          style={{ borderRadius: 10, borderColor: "#e2e8f0", color: "#64748b" }}
        >
          Refresh
        </Button>
      </div>

      {/* Table */}
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
            showTotal: t => <span style={{ color: "#64748b", fontSize: 13 }}>{fmtNum(t)} total</span>,
          }}
          scroll={{ x: 1100 }}
          onRow={u => ({
            style: { cursor: "pointer", opacity: u.isBlocked ? 0.75 : 1 },
            onClick: () => openDrawer(u),
          })}
        />
      </SectionCard>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
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
          body:   { background: "#fff", padding: 20 },
        }}
        width={380}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Detail rows */}
            {[
              ["User ID",  selected._id,                                             true],
              ["Email",    selected.email,                                            true],
              ["Role",     selected.role || "user",                                  false],
              ["Status",   selected.isBlocked ? "Blocked" : (selected.status || "active"), false],
              ["Joined",   fmtDT(selected.createdAt),                               false],
            ].map(([label, value, mono]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: 8, padding: "11px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <span style={{
                  color: "#94a3b8", fontSize: 11, fontFamily: "JetBrains Mono",
                  textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, flexShrink: 0,
                }}>
                  {label}
                </span>
                {label === "Status"
                  ? <StatusTag status={selected.status} isBlocked={selected.isBlocked} />
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

            {/* ── Complaint stats ─────────────────────────────────────────── */}
            {selected.stats && (
              <div style={{
                margin: "16px 0 4px", padding: 16,
                borderRadius: 12, background: "#f8fafc", border: "1px solid #e8ecf0",
              }}>
                <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
                  📊 Complaint Stats
                </div>

                {/* Total */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 8, background: "#fff",
                  border: "1px solid #e8ecf0", marginBottom: 10,
                }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Total</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: "JetBrains Mono" }}>
                    {fmtNum(selected.stats.totalComplaints || 0)}
                  </span>
                </div>

                {/* Pending bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>⏳ Pending</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706", fontFamily: "JetBrains Mono" }}>
                      {fmtNum(selected.stats.pendingComplaints || 0)}
                    </span>
                  </div>
                  <Progress
                    percent={
                      selected.stats.totalComplaints
                        ? Math.round((selected.stats.pendingComplaints / selected.stats.totalComplaints) * 100)
                        : 0
                    }
                    showInfo={false}
                    strokeColor="#f59e0b"
                    trailColor="#fef3c7"
                    size="small"
                  />
                </div>

                {/* Resolved bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ Resolved</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", fontFamily: "JetBrains Mono" }}>
                      {fmtNum(selected.stats.resolvedComplaints || 0)}
                    </span>
                  </div>
                  <Progress
                    percent={
                      selected.stats.totalComplaints
                        ? Math.round((selected.stats.resolvedComplaints / selected.stats.totalComplaints) * 100)
                        : 0
                    }
                    showInfo={false}
                    strokeColor="#16a34a"
                    trailColor="#dcfce7"
                    size="small"
                  />
                </div>
              </div>
            )}

            {/* ── Drawer actions ──────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>

              {/* Status change buttons — only when NOT blocked */}
              {!selected.isBlocked && (NEXT_STATUSES[selected.status] || []).length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, color: "#94a3b8", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                  }}>
                    Change Status
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(NEXT_STATUSES[selected.status] || []).map(s => {
                      const st = STATUS_STYLE[s] || STATUS_STYLE.active;
                      return (
                        <Popconfirm
                          key={s}
                          title={`Change status to "${s}"?`}
                          description={`Move ${selected.email} from "${selected.status}" → "${s}".`}
                          onConfirm={() => changeStatus(selected._id, s)}
                          okText="Confirm"
                        >
                          <Button size="small" style={{
                            background: st.bg,
                            border: `1px solid ${st.border}`,
                            color: st.color,
                            borderRadius: 8, fontWeight: 600, fontSize: 12,
                          }}>
                            → {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Button>
                        </Popconfirm>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Block / Unblock */}
              <Popconfirm
                title={selected.isBlocked ? "Unblock this user?" : "Block this user?"}
                description={
                  selected.isBlocked
                    ? "User will regain access to submit complaints."
                    : "User will lose access to submit complaints."
                }
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

              {/* Delete */}
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

      {/* ── Role change password modal ────────────────────────────────────── */}
      <RoleChangeModal
        open={roleModal}
        targetUser={roleTarget?.user}
        newRole={roleTarget?.newRole}
        onConfirm={confirmRoleChange}
        onCancel={() => { setRoleModal(false); setRoleTarget(null); }}
        loading={roleLoading}
      />
    </div>
  );
}