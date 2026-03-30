// sections/UsersSection.jsx
import { useState, useEffect, useCallback } from "react";
import {
      Input, Select, Table, Button, Popconfirm, Avatar, Drawer,
      Space, Row, Col, Modal, Progress, Checkbox, Tag,
      Empty, Spin, message,
} from "antd";
import {
      SearchOutlined, ReloadOutlined, StopOutlined,
      CheckCircleOutlined, DeleteOutlined, PlusOutlined, EyeOutlined,
      DashboardOutlined, BugOutlined, TeamOutlined, SafetyOutlined,
      FileTextOutlined, SettingOutlined, UserSwitchOutlined, UploadOutlined,
      DeleteFilled, FileAddOutlined,
} from "@ant-design/icons";
import SectionCard from "../components/SectionCard";
import KpiCard from "../components/KpiCard";
import api from "../../../../services/axios-interceptore/api.js";
import { fmtNum, fmtDate, fmtDT } from "../components/utils";

const { Option } = Select;

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "overview",    icon: <DashboardOutlined />,  label: "Overview" },
  { key: "defects",     icon: <BugOutlined />,         label: "Defect Analysis" },
  { key: "customers",   icon: <TeamOutlined />,         label: "Customer Wise" },
  { key: "warranty",    icon: <SafetyOutlined />,       label: "Warranty & PPM" },
  { key: "register",    icon: <FileTextOutlined />,     label: "Complaint Register" },
  { key: "manage",      icon: <SettingOutlined />,      label: "Manage Complaints" },
  { key: "users",       icon: <UserSwitchOutlined />,   label: "Manage Users" },
  { key: "production",  icon: <FileTextOutlined />,     label: "Manage Production" },
  { key: "bulk-upload", icon: <UploadOutlined />,       label: "Bulk Upload" },
  { key: "complaint",    icon: <FileAddOutlined />,  label: "create-complaint (cannot access internal features) " },
];

const NAV_LABEL_MAP = Object.fromEntries(NAV_ITEMS.map(n => [n.key, n.label]));
const ADVANCED_PERMISSION_KEYS = ["manage", "users"];

// ── Style maps ────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  active:    { bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.25)",  color: "#16a34a", dot: "#16a34a" },
  pending:   { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", color: "#d97706", dot: "#f59e0b" },
  suspended: { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)",  color: "#e53935", dot: "#e53935" },
};

const NEXT_STATUSES = {
  pending:   ["active", "suspended"],
  active:    ["suspended"],
  suspended: ["active"],
};

// Role badge palette — cycles for custom roles
const BADGE_PALETTE = [
  { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",  color: "#7c3aed" },
  { bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)", color: "#64748b" },
  { bg: "rgba(6,182,212,0.10)",  border: "rgba(6,182,212,0.25)",  color: "#0891b2" },
  { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)", color: "#059669" },
  { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", color: "#d97706" },
];

function getRoleBadgeStyle(roleName) {
  if (!roleName) return BADGE_PALETTE[1];
  if (roleName === "admin") return BADGE_PALETTE[0];
  if (roleName === "user")  return BADGE_PALETTE[1];
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  return BADGE_PALETTE[Math.abs(hash) % BADGE_PALETTE.length];
}

// ── Reusable badge / tag components ──────────────────────────────────────────
function RoleBadge({ roleName }) {
  const s = getRoleBadgeStyle(roleName);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 12px",
      borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 12, fontWeight: 700, textTransform: "capitalize",
    }}>
      {roleName || "user"}
    </span>
  );
}

function StatusTag({ status, isBlocked, onClick }) {
  const key = isBlocked ? "suspended" : (status || "active");
  const s   = STATUS_STYLE[key] || STATUS_STYLE.active;
  const label = isBlocked ? "Blocked"
    : status ? status.charAt(0).toUpperCase() + status.slice(1) : "Active";
  return (
    <span
      onClick={!isBlocked && onClick ? onClick : undefined}
      title={isBlocked ? "Unblock user first" : "Click to change status"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 12px", borderRadius: 20,
        background: isBlocked ? "rgba(239,68,68,0.10)" : s.bg,
        border: `1px solid ${isBlocked ? "rgba(239,68,68,0.25)" : s.border}`,
        color: isBlocked ? "#e53935" : s.color,
        fontSize: 12, fontWeight: 700,
        cursor: isBlocked || !onClick ? "default" : "pointer",
        userSelect: "none", transition: "opacity 0.15s",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
        background: isBlocked ? "#e53935" : s.dot }} />
      {label}
    </span>
  );
}

const ACTION_CHIP_STYLE = {
  view:   { bg: "rgba(22,163,74,0.08)",  border: "rgba(22,163,74,0.25)",  color: "#16a34a", icon: "👁" },
  edit:   { bg: "rgba(37,99,235,0.08)",  border: "rgba(37,99,235,0.25)",  color: "#2563eb", icon: "✏️" },
  delete: { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  color: "#e53935", icon: "🗑" },
};

function ActionChip({ action }) {
  const s = ACTION_CHIP_STYLE[action] || ACTION_CHIP_STYLE.view;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 9px", borderRadius: 6,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 700,
    }}>
      {s.icon} {action}
    </span>
  );
}

// ── View Roles Modal ──────────────────────────────────────────────────────────
function ViewRolesModal({ open, onClose, roles, rolesLoading, onDeleteRole }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(6,182,212,0.10)", border: "1.5px solid rgba(6,182,212,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🛡</span>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>All Roles & Permissions</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
              {roles.length} role{roles.length !== 1 ? "s" : ""} configured
            </div>
          </div>
        </div>
      }
    >
      {rolesLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : roles.length === 0 ? (
        <Empty description="No roles found" style={{ padding: 40 }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0 4px" }}>
          {roles.map(role => {
            const s = getRoleBadgeStyle(role.name);
            return (
              <div key={role._id} style={{
                borderRadius: 12, border: "1.5px solid #e2e8f0",
                background: "#fafbfc", overflow: "hidden",
              }}>
                {/* Role header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 16px", background: s.bg, borderBottom: "1px solid #e8ecf0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "#fff", border: `1.5px solid ${s.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: s.color, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(role.name || "R")[0].toUpperCase()}
                    </span>
                    <div>
                      <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 13, textTransform: "capitalize" }}>
                        {role.name}
                      </span>
                      {role.description ? (
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{role.description}</div>
                      ) : null}
                    </div>
                    {role.isDefault && (
                      <Tag style={{
                        fontSize: 10, padding: "0 6px", borderRadius: 4,
                        background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                        color: "#7c3aed", marginLeft: 4,
                      }}>Default</Tag>
                    )}
                    {role.isActive === false && (
                      <Tag style={{
                        fontSize: 10, padding: "0 6px", borderRadius: 4,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                        color: "#e53935",
                      }}>Inactive</Tag>
                    )}

                    <Popconfirm
                      title={`Update role "${role.name}"?`}
                      description="Users with this role will lose it. Cannot be undone."
                      onConfirm={() => onDeleteRole(role._id)}
                      okText="Delete" okButtonProps={{ danger: true }}
                      placement="left"
                    >
                      <Button
                        size="small" danger icon={<DeleteFilled />}
                        style={{
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          color: "#e53935", borderRadius: 8,
                        }}
                      />
                    </Popconfirm>
                  </div>
                  

                  {!role.isDefault && (
                    <Popconfirm
                      title={`Delete role "${role.name}"?`}
                      description="Users with this role will lose it. Cannot be undone."
                      onConfirm={() => onDeleteRole(role._id)}
                      okText="Delete" okButtonProps={{ danger: true }}
                      placement="left"
                    >
                      <Button
                        size="small" danger icon={<DeleteFilled />}
                        style={{
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          color: "#e53935", borderRadius: 8,
                        }}
                      />
                    </Popconfirm>
                  )}
                </div>

                {/* Permissions + Actions body */}
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>Menu Access</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {(role.permissions || []).length === 0 ? (
                        <span style={{ fontSize: 12, color: "#cbd5e1" }}>No menus assigned</span>
                      ) : (role.permissions || []).map(key => (
                        <span key={key} style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "2px 9px", borderRadius: 6,
                          background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)",
                          color: "#7c3aed", fontSize: 11, fontWeight: 600,
                        }}>
                          {NAV_LABEL_MAP[key] || key}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>Allowed Actions</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(role.action || []).length === 0 ? (
                        <span style={{ fontSize: 12, color: "#cbd5e1" }}>No actions assigned</span>
                      ) : (role.action || []).map(a => <ActionChip key={a} action={a} />)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Add Role Modal ────────────────────────────────────────────────────────────
function AddRoleModal({ open, onConfirm, onCancel, loading }) {
  const [roleName, setRoleName]           = useState("");
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [actions, setActions]             = useState({ view: true, edit: false, delete: false });

  const showAdvanced = selectedMenus.some(k => ADVANCED_PERMISSION_KEYS.includes(k));

  useEffect(() => {
    if (!open) {
      setRoleName(""); setSelectedMenus([]);
      setActions({ view: true, edit: false, delete: false });
    }
  }, [open]);

  const handleMenuChange = (vals) => {
    setSelectedMenus(vals);
    if (!vals.some(k => ADVANCED_PERMISSION_KEYS.includes(k)))
      setActions(prev => ({ ...prev, edit: false, delete: false }));
  };

  const handleSubmit = () => {
    if (!roleName.trim() || selectedMenus.length === 0) return;
    const activeActions = Object.entries(actions).filter(([, v]) => v).map(([k]) => k);
    onConfirm({
      role: roleName.trim().toLowerCase().replace(/\s+/g, "-"),
      permission: selectedMenus,
      action: activeActions,
    });
  };

  const isValid = roleName.trim().length > 0 && selectedMenus.length > 0;
  const menuLabelMap = Object.fromEntries(NAV_ITEMS.map(n => [n.key, n.label]));

  return (
    <Modal
      open={open} onCancel={onCancel} onOk={handleSubmit}
      okText="Create Role" cancelText="Cancel"
      confirmLoading={loading}
      okButtonProps={{
        disabled: !isValid,
        style: {
          background: isValid ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : undefined,
          border: "none", borderRadius: 8, fontWeight: 700,
        },
      }}
      width={520} destroyOnClose
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(139,92,246,0.12)", border: "1.5px solid rgba(139,92,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🔑</span>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>Add New Role</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>Define name, menu access & permissions</div>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "12px 0 4px" }}>

        {/* Role Name */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 7,
          }}>
            Role Name <span style={{ color: "#e53935" }}>*</span>
          </label>
          <Input
            placeholder="e.g. Quality Manager, Analyst…"
            value={roleName} onChange={e => setRoleName(e.target.value)}
            style={{ borderRadius: 10 }}
            prefix={<span style={{ marginRight: 4, opacity: 0.5 }}>🏷</span>}
          />
          {roleName.trim() && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
              Saved as: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, color: "#7c3aed" }}>
                {roleName.trim().toLowerCase().replace(/\s+/g, "-")}
              </code>
            </div>
          )}
        </div>

        {/* Menu Access */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 7,
          }}>
            Menu Access <span style={{ color: "#e53935" }}>*</span>
          </label>
          <Select
            mode="multiple" allowClear
            placeholder="Select menus this role can access…"
            value={selectedMenus} onChange={handleMenuChange}
            style={{ width: "100%" }} optionLabelProp="label"
            tagRender={({ label, value, onClose }) => (
              <Tag closable onClose={onClose} style={{
                background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                color: "#7c3aed", borderRadius: 6, fontWeight: 600, fontSize: 11, marginRight: 4,
              }}>
                {menuLabelMap[value] || value}
              </Tag>
            )}
          >
            {NAV_ITEMS.map(item => (
              <Option key={item.key} value={item.key} label={item.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#7c3aed", opacity: 0.7, fontSize: 13 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                  {ADVANCED_PERMISSION_KEYS.includes(item.key) && (
                    <Tag style={{
                      fontSize: 10, padding: "0 5px", lineHeight: "16px",
                      background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                      color: "#d97706", borderRadius: 4, marginLeft: "auto",
                    }}>Edit/Delete</Tag>
                  )}
                </div>
              </Option>
            ))}
          </Select>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
            💡 Select <strong>Manage Complaints</strong> or <strong>Manage Users</strong> to unlock Edit & Delete.
          </div>
        </div>

        {/* Actions */}
        <div>
          <label style={{
            display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10,
          }}>Actions</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* View */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              borderRadius: 10, background: "rgba(22,163,74,0.08)",
              border: "1.5px solid rgba(22,163,74,0.3)", flex: 1, minWidth: 100,
            }}>
              <Checkbox checked disabled />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>👁 View</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Always granted</div>
              </div>
            </div>
            {/* Edit */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              borderRadius: 10, flex: 1, minWidth: 100, transition: "all 0.2s",
              opacity: showAdvanced ? 1 : 0.45,
              background: showAdvanced && actions.edit ? "rgba(37,99,235,0.08)" : "#f8fafc",
              border: `1.5px solid ${showAdvanced && actions.edit ? "rgba(37,99,235,0.3)" : "#e2e8f0"}`,
            }}>
              <Checkbox checked={actions.edit} disabled={!showAdvanced}
                onChange={e => setActions(p => ({ ...p, edit: e.target.checked }))} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: showAdvanced && actions.edit ? "#2563eb" : "#94a3b8" }}>
                  ✏️ Edit
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{showAdvanced ? "Modify records" : "Select adv. menu"}</div>
              </div>
            </div>
            {/* Delete */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              borderRadius: 10, flex: 1, minWidth: 100, transition: "all 0.2s",
              opacity: showAdvanced ? 1 : 0.45,
              background: showAdvanced && actions.delete ? "rgba(239,68,68,0.08)" : "#f8fafc",
              border: `1.5px solid ${showAdvanced && actions.delete ? "rgba(239,68,68,0.3)" : "#e2e8f0"}`,
            }}>
              <Checkbox checked={actions.delete} disabled={!showAdvanced}
                onChange={e => setActions(p => ({ ...p, delete: e.target.checked }))} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: showAdvanced && actions.delete ? "#e53935" : "#94a3b8" }}>
                  🗑 Delete
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{showAdvanced ? "Remove records" : "Select adv. menu"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Inline role-change select with per-change Popconfirm ──────────────────────
function RoleChangeSelect({ user, roles, currentRole, disabled, onConfirm }) {
  const [pendingRole, setPendingRole] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingRoleName = roles.find(r => r._id === pendingRole)?.name || pendingRole;

  return (
    <Popconfirm
      open={confirmOpen}
      title="Change role?"
      description={`Assign "${pendingRoleName}" to ${user.email}?`}
      onConfirm={() => { onConfirm(pendingRole); setConfirmOpen(false); setPendingRole(null); }}
      onCancel={() => { setConfirmOpen(false); setPendingRole(null); }}
      okText="Confirm" cancelText="Cancel" placement="bottom"
    >
      <Select
        value={currentRole}
        size="small"
        disabled={disabled}
        onChange={v => {
          if (v === currentRole) return;
          setPendingRole(v);
          setConfirmOpen(true);
        }}
        onClick={e => e.stopPropagation()}
        style={{ width: 120 }}
      >
        {roles.map(r => (
          <Option key={r._id} value={r._id}>
            <span style={{ textTransform: "capitalize" }}>{r.name}</span>
          </Option>
        ))}
      </Select>
    </Popconfirm>
  );
}

// ── Status cell ───────────────────────────────────────────────────────────────
function StatusCell({ user, onStatusChange }) {
  const [open, setOpen]   = useState(false);
  const [next, setNext]   = useState(null);
  const options = NEXT_STATUSES[user.status] || [];

  const handleTagClick = (e) => {
    e.stopPropagation();
    if (user.isBlocked || options.length === 0) return;
    setNext(options[0]); setOpen(true);
  };

  return (
    <Popconfirm
      open={open}
      title={`Change status to "${next}"?`}
      description={
        options.length > 1 ? (
          <div>
            <p style={{ marginBottom: 8 }}>Move <strong>{user.email}</strong> to:</p>
            <Select size="small" value={next} onClick={e => e.stopPropagation()}
              onChange={v => setNext(v)} style={{ width: "100%" }}>
              {options.map(s => <Option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</Option>)}
            </Select>
          </div>
        ) : `Move ${user.email} from "${user.status}" → "${next}"?`
      }
      onConfirm={e => { e?.stopPropagation(); onStatusChange(user._id, next); setOpen(false); }}
      onCancel={e => { e?.stopPropagation(); setOpen(false); }}
      okText="Change Status" cancelText="Cancel" placement="bottom"
    >
      <span onClick={e => e.stopPropagation()}>
        <StatusTag status={user.status} isBlocked={user.isBlocked} onClick={handleTagClick} />
      </span>
    </Popconfirm>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UsersSection({ addToast }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState("");
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawer] = useState(false);

  // Roles from API
  const [roles, setRoles]               = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Modals
  const [addRoleModal, setAddRoleModal]     = useState(false);
  const [addRoleLoading, setAddRoleLoading] = useState(false);
  const [viewRolesModal, setViewRolesModal] = useState(false);

  const user = JSON.parse(localStorage.getItem("User") || "{}");

  const canEdit = user.isSystemRole || (user.roleId && user.roleId.action.includes("edit"));
  const canDelete = user.isSystemRole || (user.roleId && user.roleId.action.includes("delete"));

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await api.get("/auth/roles");
      setRoles(res.data?.roles || []);
    } catch (err) {
      console.error("Fetch roles error:", err.message || err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get("/users")
      .then(r => {
        const list = (r.data?.users || [])
          .filter(u => !u.isSystemRole)
          .map(u => ({ ...u, role: u.role || "user" }));
        setUsers(list);
        console.log("Fetched users:", list);
      })
      .catch(() => message.error("Failed to load users", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  // Helper: resolve role _id → display name
  const resolveRoleName = (roleValue) => {
    if (!roleValue) return "user";
    const found = roles.find(r => r._id === roleValue || r.name === roleValue);
    return found ? found.name : roleValue;
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const blockUser = async (id, isBlocked) => {
    const action = isBlocked ? "unblock" : "block";
    try {
      await api.post(`/users/${action}`, { id });
      message.success(`User ${action}ed`, "success");
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: !isBlocked } : u));
      if (selected?._id === id) setSelected(s => ({ ...s, isBlocked: !isBlocked }));
    } catch { message.error(`Failed to ${action}`, "error"); }
  };

  const deleteUser = async (id) => {
    try {
      await api.post("/users/delete", { id });
      message.success("User deleted", "success");
      setUsers(prev => prev.filter(u => u._id !== id));
      if (selected?._id === id) { setDrawer(false); setSelected(null); }
    } catch { message.error("Delete failed", "error"); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.post("/users/status", { id, status });
      message.success(`Status changed to "${status}"`, "success");
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status } : u));
      if (selected?._id === id) setSelected(s => ({ ...s, status }));
    } catch { message.error("Status update failed", "error"); }
  };

  // Direct role change — sends role._id
  const changeUserRole = async (userId, roleId) => {
    try {
    const res = await api.post("/user/assign-role", { userId, roleId });
    if(res.data?.success) {
      message.success(res.data.message);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: roleId } : u));
        if (selected?._id === userId) setSelected(s => ({ ...s, role: roleId }));
    }
    } catch (err) {
      message.error(err?.response?.data?.message || "Role update failed", "error");
    }
  };



  const handleCreateRole = async (payload) => {
    console.log("Creating role with payload:", payload);
    setAddRoleLoading(true);
    try {
      await api.post("/auth/create-role", payload);
      message.success(`Role "${payload.role}" created`);
      setAddRoleModal(false);
      fetchRoles();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create role");
    } finally {
      setAddRoleLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await api.delete(`/auth/roles/${roleId}`);
      message.success("Role deleted");
      setRoles(prev => prev.filter(r => r._id !== roleId));
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete role");
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const roleName = resolveRoleName(u.role);
    if (q && !`${u.email || ""} ${roleName}`.toLowerCase().includes(q)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  const kpi = {
    total:   users.length,
    active:  users.filter(u => !u.isBlocked && u.status === "active").length,
    blocked: users.filter(u => u.isBlocked).length,
    admins:  users.filter(u => resolveRoleName(u.role) === "admin").length,
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
            color: u.isBlocked ? "#e53935" : "#7c3aed", fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${u.isBlocked ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.25)"}`,
          }}>
            {(u.email || "U")[0].toUpperCase()}
          </Avatar>
          <span style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{u.email}</span>
        </div>
      ),
    },
    {
      title: "Role", key: "role", width: 120,
      render: (_, u) => <RoleBadge roleName={resolveRoleName(u.roleId? u.roleId.name : 'user')} />,
    },
    {
      title: "Complaints", dataIndex: "complaintCount", key: "cc", width: 110,
      render: v => (
        <span style={{
          fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700,
          color: (v || 0) > 20 ? "#e53935" : "#1e293b",
        }}>{fmtNum(v || 0)}</span>
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
    ...user.isSystemRole ? [{
      title: "Change Role", key: "role_change", width: 150,
      render: (_, u) => (
        <span onClick={e => e.stopPropagation()}>
          <RoleChangeSelect
            user={u}
            roles={roles}
            currentRole={u.roleId}
            disabled={u.isBlocked}
            onConfirm={roleId => changeUserRole(u._id, roleId)}
          />
        </span>
      ),
    },] : [],

    ...canDelete ? [
    {
      title: "Actions", key: "actions", width: 160, fixed: "right",
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
              }}
            >
              {u.isBlocked ? "Unblock" : "Block"}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Delete user?" description="This cannot be undone."
            onConfirm={() => deleteUser(u._id)}
            okText="Delete" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#e53935", borderRadius: 8,
            }} />
          </Popconfirm>
        </Space>
      ),
    },
  ] : [],
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

      {/* Filters + buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search by email or role…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
          className="pg-input" allowClear
        />
        <Select
          value={roleFilter || undefined}
          onChange={v => setRole(v || "")}
          allowClear placeholder="All Roles"
          style={{ minWidth: 140 }} className="pg-select"
        >
          {roles.map(r => (
            <Option key={r._id} value={r._id}>
              <span style={{ textTransform: "capitalize" }}>{r.name}</span>
            </Option>
          ))}
        </Select>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => { fetchUsers(); fetchRoles(); }}
          loading={loading}
          style={{ borderRadius: 10, borderColor: "#e2e8f0", color: "#64748b" }}
        >
          Refresh
        </Button>

        {/* View Roles */}
       {user?.isSystemRole && <Button
          icon={<EyeOutlined />}
          onClick={() => setViewRolesModal(true)}
          style={{
            borderRadius: 10,
            background: "rgba(6,182,212,0.08)",
            border: "1.5px solid rgba(6,182,212,0.3)",
            color: "#0891b2", fontWeight: 700,
          }}
        >
          View Roles
        </Button>}

        {/* Add Role */}
       {user?.isSystemRole && <Button
          type="primary" icon={<PlusOutlined />}
          onClick={() => setAddRoleModal(true)}
          style={{
            borderRadius: 10,
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
            border: "none", fontWeight: 700,
            boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
          }}
        >
          Add Role
        </Button>}
      </div>

      {/* Table */}
      <SectionCard title={`Manage Users (${fmtNum(filtered.length)})`} icon="👥">
        <Table
          dataSource={filtered} columns={columns}
          rowKey={u => u._id} size="middle" loading={loading}
          className="pg-table"
          pagination={{
            pageSize: 12, showSizeChanger: true,
            showTotal: t => <span style={{ color: "#64748b", fontSize: 13 }}>{fmtNum(t)} total</span>,
          }}
          scroll={{ x: 1150 }}
          onRow={u => ({
            style: { cursor: "pointer", opacity: u.isBlocked ? 0.75 : 1 },
            onClick: () => openDrawer(u),
          })}
        />
      </SectionCard>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen} onClose={() => setDrawer(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar size={38} style={{
              background: "rgba(139,92,246,0.12)", color: "#7c3aed",
              fontWeight: 700, fontSize: 14, border: "1.5px solid rgba(139,92,246,0.25)",
            }}>
              {(selected?.email || "U")[0].toUpperCase()}
            </Avatar>
            <div>
              <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 14 }}>{selected?.email}</div>
              <RoleBadge roleName={resolveRoleName(selected?.role)} />
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
            {[
              ["Email",  selected.email,                                                   true],
              ["Role",   resolveRoleName(selected.role),                                  false],
              ["Status", selected.isBlocked ? "Blocked" : (selected.status || "active"), false],
              ["Joined", fmtDT(selected.createdAt),                                       false],
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
                {label === "Status" ? <StatusTag status={selected.status} isBlocked={selected.isBlocked} />
                  : label === "Role" ? <RoleBadge roleName={value} />
                  : <span style={{
                      color: mono ? "#2563eb" : "#1e293b",
                      fontFamily: mono ? "JetBrains Mono" : "inherit",
                      fontSize: mono ? 11 : 13,
                      fontWeight: 600, textAlign: "right", wordBreak: "break-all",
                    }}>{value}</span>
                }
              </div>
            ))}

            {selected.stats && (
              <div style={{
                margin: "16px 0 4px", padding: 16,
                borderRadius: 12, background: "#f8fafc", border: "1px solid #e8ecf0",
              }}>
                <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>📊 Complaint Stats</div>
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
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>⏳ Pending</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706", fontFamily: "JetBrains Mono" }}>
                      {fmtNum(selected.stats.pendingComplaints || 0)}
                    </span>
                  </div>
                  <Progress
                    percent={selected.stats.totalComplaints ? Math.round((selected.stats.pendingComplaints / selected.stats.totalComplaints) * 100) : 0}
                    showInfo={false} strokeColor="#f59e0b" trailColor="#fef3c7" size="small"
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✅ Resolved</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", fontFamily: "JetBrains Mono" }}>
                      {fmtNum(selected.stats.resolvedComplaints || 0)}
                    </span>
                  </div>
                  <Progress
                    percent={selected.stats.totalComplaints ? Math.round((selected.stats.resolvedComplaints / selected.stats.totalComplaints) * 100) : 0}
                    showInfo={false} strokeColor="#16a34a" trailColor="#dcfce7" size="small"
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>

              {/* Status change */}
              {!selected.isBlocked && (NEXT_STATUSES[selected.status] || []).length > 0 && (
                <div>
                  <div style={{
                    fontSize: 11, color: "#94a3b8", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                  }}>Change Status</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(NEXT_STATUSES[selected.status] || []).map(s => {
                      const st = STATUS_STYLE[s] || STATUS_STYLE.active;
                      return (
                        <Popconfirm key={s}
                          title={`Change status to "${s}"?`}
                          description={`Move ${selected.email} from "${selected.status}" → "${s}".`}
                          onConfirm={() => changeStatus(selected._id, s)}
                          okText="Confirm"
                        >
                          <Button size="small" style={{
                            background: st.bg, border: `1px solid ${st.border}`,
                            color: st.color, borderRadius: 8, fontWeight: 600, fontSize: 12,
                          }}>
                            → {s.charAt(0).toUpperCase() + s.slice(1)}
                          </Button>
                        </Popconfirm>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Role change in drawer */}
              <div>
                <div style={{
                  fontSize: 11, color: "#94a3b8", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                }}>Change Role</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {roles.map(r => {
                    const isCurrent = selected.role === r._id || selected.role === r.name;
                    const s = getRoleBadgeStyle(r.name);
                    return (
                      <Popconfirm key={r._id}
                        title={`Assign role "${r.name}"?`}
                        description={`${selected.email} will get permissions of "${r.name}".`}
                        onConfirm={() => changeUserRole(selected._id, r._id)}
                        okText="Confirm" disabled={isCurrent}
                      >
                        <Button size="small" disabled={isCurrent} style={{
                          background: isCurrent ? s.bg : "#f8fafc",
                          border: `1px solid ${isCurrent ? s.border : "#e2e8f0"}`,
                          color: isCurrent ? s.color : "#64748b",
                          borderRadius: 8, fontWeight: 600, fontSize: 12,
                          textTransform: "capitalize",
                        }}>
                          {isCurrent ? "✓ " : ""}{r.name}
                        </Button>
                      </Popconfirm>
                    );
                  })}
                </div>
              </div>

              {/* Block / Unblock */}
              <Popconfirm
                title={selected.isBlocked ? "Unblock this user?" : "Block this user?"}
                description={selected.isBlocked ? "User will regain access." : "User will lose complaint access."}
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
                okText="Delete" okButtonProps={{ danger: true }}
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

      {/* ── Add Role modal ────────────────────────────────────────────────── */}
      <AddRoleModal
        open={addRoleModal}
        onConfirm={handleCreateRole}
        onCancel={() => setAddRoleModal(false)}
        loading={addRoleLoading}
      />

      {/* ── View Roles modal ──────────────────────────────────────────────── */}
      <ViewRolesModal
        open={viewRolesModal}
        onClose={() => setViewRolesModal(false)}
        roles={roles}
        rolesLoading={rolesLoading}
        onDeleteRole={handleDeleteRole}
      />
    </div>
  );
}