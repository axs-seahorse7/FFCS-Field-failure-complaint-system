// sections/UsersSection.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Input, Select, Table, Button, Popconfirm, Avatar, Drawer,
  Space, Row, Col, Modal, Progress, Checkbox, Tag,
  Empty, Spin, message, Tooltip, Divider,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, StopOutlined,
  CheckCircleOutlined, DeleteOutlined, PlusOutlined, EyeOutlined,
  DashboardOutlined, BugOutlined, TeamOutlined, SafetyOutlined,
  FileTextOutlined, SettingOutlined, UserSwitchOutlined, UploadOutlined,
  DeleteFilled, EditOutlined, FileAddOutlined, 
  UserOutlined, LockOutlined, UnlockOutlined,
} from "@ant-design/icons";


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
  { key: "complaint",   icon: <FileAddOutlined />,      label: "Create Complaint" },
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

const BADGE_PALETTE = [
  { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)",  color: "#7c3aed" },
  { bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.25)", color: "#64748b" },
  { bg: "rgba(6,182,212,0.10)",  border: "rgba(6,182,212,0.25)",  color: "#0891b2" },
  { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)", color: "#059669" },
  { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", color: "#d97706" },
  { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)",  color: "#e53935" },
];

function getRoleBadgeStyle(roleName) {
  if (!roleName) return BADGE_PALETTE[1];
  if (roleName === "admin") return BADGE_PALETTE[0];
  if (roleName === "user")  return BADGE_PALETTE[1];
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  return BADGE_PALETTE[Math.abs(hash) % BADGE_PALETTE.length];
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function RoleBadge({ roleName }) {
  const s = getRoleBadgeStyle(roleName);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 700, textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
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
        userSelect: "none", transition: "all 0.15s",
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
      padding: "3px 10px", borderRadius: 6,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 700,
    }}>
      {s.icon} {action}
    </span>
  );
}

// ── Role Form Modal (shared for Add + Edit) ───────────────────────────────────
function RoleFormModal({ open, onConfirm, onCancel, loading, initialData }) {
  const isEdit = !!initialData;

  const [roleName, setRoleName]     = useState("");
  const [selectedMenus, setMenus]   = useState([]);
  const [actions, setActions]       = useState({ view: true, edit: false, delete: false });

  // Populate when editing
  useEffect(() => {
    if (open && isEdit && initialData) {
      setRoleName(initialData.name || "");
      setMenus(initialData.permissions || []);
      setActions({
        view:   true,
        edit:   (initialData.action || []).includes("edit"),
        delete: (initialData.action || []).includes("delete"),
      });
    }
    if (!open) {
      setRoleName(""); setMenus([]);
      setActions({ view: true, edit: false, delete: false });
    }
  }, [open, isEdit, initialData]);

  const showAdvanced = selectedMenus.some(k => ADVANCED_PERMISSION_KEYS.includes(k));

  const handleMenuChange = (vals) => {
    setMenus(vals);
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
      ...(isEdit ? { id: initialData._id } : {}),
    });
  };

  const isValid = roleName.trim().length > 0 && selectedMenus.length > 0;
  const menuLabelMap = Object.fromEntries(NAV_ITEMS.map(n => [n.key, n.label]));

  return (
    <Modal
      open={open} onCancel={onCancel} onOk={handleSubmit}
      okText={isEdit ? "Update Role" : "Create Role"}
      cancelText="Cancel"
      confirmLoading={loading}
      okButtonProps={{
        disabled: !isValid,
        style: {
          background: isValid
            ? isEdit
              ? "linear-gradient(135deg,#2563eb,#1d4ed8)"
              : "linear-gradient(135deg,#7c3aed,#6d28d9)"
            : undefined,
          border: "none", borderRadius: 8, fontWeight: 700,
        },
      }}
      width={520} destroyOnClose
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: isEdit ? "rgba(37,99,235,0.10)" : "rgba(139,92,246,0.12)",
            border: `1.5px solid ${isEdit ? "rgba(37,99,235,0.25)" : "rgba(139,92,246,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          }}>
            {isEdit ? "✏️" : "🔑"}
          </span>
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15 }}>
              {isEdit ? `Edit Role: ${initialData?.name}` : "Add New Role"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
              {isEdit ? "Update permissions and menu access" : "Define name, menu access & permissions"}
            </div>
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
              Saved as:{" "}
              <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, color: "#7c3aed" }}>
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
          <div style={{ display: "flex", gap: 10 }}>
            {/* View — always on */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              borderRadius: 10, background: "rgba(22,163,74,0.08)",
              border: "1.5px solid rgba(22,163,74,0.3)", flex: 1,
            }}>
              <Checkbox checked disabled />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>👁 View</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Always granted</div>
              </div>
            </div>
            {/* Edit */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              borderRadius: 10, flex: 1, transition: "all 0.2s",
              opacity: showAdvanced ? 1 : 0.4,
              background: showAdvanced && actions.edit ? "rgba(37,99,235,0.08)" : "#f8fafc",
              border: `1.5px solid ${showAdvanced && actions.edit ? "rgba(37,99,235,0.3)" : "#e2e8f0"}`,
            }}>
              <Checkbox checked={actions.edit} disabled={!showAdvanced}
                onChange={e => setActions(p => ({ ...p, edit: e.target.checked }))} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: showAdvanced && actions.edit ? "#2563eb" : "#94a3b8" }}>✏️ Edit</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{showAdvanced ? "Modify records" : "Needs adv. menu"}</div>
              </div>
            </div>
            {/* Delete */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              borderRadius: 10, flex: 1, transition: "all 0.2s",
              opacity: showAdvanced ? 1 : 0.4,
              background: showAdvanced && actions.delete ? "rgba(239,68,68,0.08)" : "#f8fafc",
              border: `1.5px solid ${showAdvanced && actions.delete ? "rgba(239,68,68,0.3)" : "#e2e8f0"}`,
            }}>
              <Checkbox checked={actions.delete} disabled={!showAdvanced}
                onChange={e => setActions(p => ({ ...p, delete: e.target.checked }))} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: showAdvanced && actions.delete ? "#e53935" : "#94a3b8" }}>🗑 Delete</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{showAdvanced ? "Remove records" : "Needs adv. menu"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── View Roles Modal ──────────────────────────────────────────────────────────
function ViewRolesModal({ open, onClose, roles, rolesLoading, onEditRole, onDeleteRole }) {
  return (
    <Modal
      open={open} onCancel={onClose} footer={null}
      width={660} destroyOnClose
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(6,182,212,0.10)", border: "1.5px solid rgba(6,182,212,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0 4px" }}>
          {roles.map(role => {
            const s = getRoleBadgeStyle(role.name);
            return (
              <div key={role._id} style={{
                borderRadius: 12, border: "1.5px solid #e2e8f0",
                background: "#fff", overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                {/* Header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: `linear-gradient(135deg, ${s.bg}, rgba(255,255,255,0.6))`,
                  borderBottom: "1px solid #f0f2f5",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: "#fff", border: `1.5px solid ${s.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, color: s.color, fontWeight: 800,
                    }}>
                      {(role.name || "R")[0].toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13, textTransform: "capitalize", lineHeight: 1.3 }}>
                        {role.name}
                      </div>
                      {role.description && (
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{role.description}</div>
                      )}
                    </div>
                    {role.isDefault && (
                      <Tag style={{
                        fontSize: 10, padding: "0 6px", borderRadius: 4,
                        background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                        color: "#7c3aed", marginLeft: 2,
                      }}>Default</Tag>
                    )}
                    {role.isActive === false && (
                      <Tag style={{
                        fontSize: 10, padding: "0 6px", borderRadius: 4,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                        color: "#e53935",
                      }}>Inactive</Tag>
                    )}
                  </div>

                  {/* Action buttons */}
                  <Space size={6}>
                    <Tooltip title="Edit role">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEditRole(role)}
                        style={{
                          background: "rgba(37,99,235,0.07)",
                          border: "1px solid rgba(37,99,235,0.2)",
                          color: "#2563eb", borderRadius: 8,
                        }}
                      />
                    </Tooltip>
                    {!role.isDefault && (
                      <Popconfirm
                        title={`Delete role "${role.name}"?`}
                        description="Users with this role will lose it. Cannot be undone."
                        onConfirm={() => onDeleteRole(role._id)}
                        okText="Delete" okButtonProps={{ danger: true }}
                        placement="left"
                      >
                        <Tooltip title="Delete role">
                          <Button
                            size="small" danger icon={<DeleteFilled />}
                            style={{
                              background: "rgba(239,68,68,0.06)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#e53935", borderRadius: 8,
                            }}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                </div>

                {/* Body */}
                <div style={{ padding: "10px 14px", display: "flex", gap: 16 }}>
                  {/* Menus */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>Menu Access</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(role.permissions || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "#cbd5e1" }}>None</span>
                      ) : (role.permissions || []).map(key => (
                        <span key={key} style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "2px 8px", borderRadius: 5,
                          background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)",
                          color: "#7c3aed", fontSize: 10, fontWeight: 600,
                        }}>
                          {NAV_LABEL_MAP[key] || key}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Divider */}
                  <div style={{ width: 1, background: "#f1f5f9", flexShrink: 0 }} />
                  {/* Actions */}
                  <div style={{ minWidth: 110 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
                    }}>Actions</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {(role.action || []).length === 0 ? (
                        <span style={{ fontSize: 11, color: "#cbd5e1" }}>None</span>
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

// ── Inline role-change select ─────────────────────────────────────────────────
function RoleChangeSelect({ user, roles, currentRoleId, disabled, onConfirm }) {
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
        value={currentRoleId || undefined}
        placeholder="Assign role…"
        size="small"
        disabled={disabled}
        onChange={v => {
          if (v === currentRoleId) return;
          setPendingRole(v);
          setConfirmOpen(true);
        }}
        onClick={e => e.stopPropagation()}
        style={{ width: 130 }}
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
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(null);
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

  // Roles
  const [roles, setRoles]               = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Modals
  const [roleFormModal, setRoleFormModal]     = useState(false);
  const [roleFormLoading, setRoleFormLoading] = useState(false);
  const [editingRole, setEditingRole]         = useState(null); // null = add, obj = edit
  const [viewRolesModal, setViewRolesModal]   = useState(false);

  // Current logged-in user
  const loggedUser = (() => {
    try { return JSON.parse(localStorage.getItem("User") || "{}"); } catch { return {}; }
  })();
  const canEdit   = loggedUser.isSystemRole || (loggedUser.roleId?.action || []).includes("edit");
  const canDelete = loggedUser.isSystemRole || (loggedUser.roleId?.action || []).includes("delete");

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
          .map(u => ({ ...u }));
        setUsers(list);
      })
      .catch(() => message.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const blockUser = async (id, isBlocked) => {
    const action = isBlocked ? "unblock" : "block";
    try {
      await api.post(`/users/${action}`, { id });
      message.success(`User ${action}ed`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: !isBlocked } : u));
      if (selected?._id === id) setSelected(s => ({ ...s, isBlocked: !isBlocked }));
    } catch { message.error(`Failed to ${action}`); }
  };

  const deleteUser = async (id) => {
    try {
      await api.post("/users/delete", { id });
      message.success("User deleted");
      setUsers(prev => prev.filter(u => u._id !== id));
      if (selected?._id === id) { setDrawer(false); setSelected(null); }
    } catch { message.error("Delete failed"); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.post("/users/status", { id, status });
      message.success(`Status changed to "${status}"`);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status } : u));
      if (selected?._id === id) setSelected(s => ({ ...s, status }));
    } catch { message.error("Status update failed"); }
  };

  const changeUserRole = async (userId, roleId) => {
    try {
      const res = await api.post("/user/assign-role", { userId, roleId });
      if (res.data?.success) {
        message.success(res.data.message || "Role updated");
        const assignedRole = roles.find(r => r._id === roleId);
        setUsers(prev => prev.map(u =>
          u._id === userId ? { ...u, roleId: assignedRole || { _id: roleId } } : u
        ));
        if (selected?._id === userId)
          setSelected(s => ({ ...s, roleId: assignedRole || { _id: roleId } }));
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "Role update failed");
    }
  };

  // ── Role CRUD ─────────────────────────────────────────────────────────────
  const openAddRole  = () => { setEditingRole(null); setRoleFormModal(true); };
  const openEditRole = (role) => { setEditingRole(role); setRoleFormModal(true); };

  const handleRoleFormSubmit = async (payload) => {
    setRoleFormLoading(true);
    try {
      if (editingRole) {
        // Update
        const res = await api.put(`/auth/roles/${payload.id}`, {
          name:        payload.role,
          permissions: payload.permission,
          action:      payload.action,
        });
        if (res.data?.success || res.status === 200) {
          message.success(`Role "${payload.role}" updated`);
        }
      } else {
        // Create
        await api.post("/auth/create-role", payload);
        message.success(`Role "${payload.role}" created`);
      }
      setRoleFormModal(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      message.error(err?.response?.data?.message || `Failed to ${editingRole ? "update" : "create"} role`);
    } finally {
      setRoleFormLoading(false);
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
  // role display name helper — user.roleId is the populated object from server
  const getRoleName = (u) => u?.roleId?.name 
  const getRoleId   = (u) => u?.roleId?._id  || u?.roleId || null;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const rName = getRoleName(u);
    if (q && !`${u.email || ""} ${rName}`.toLowerCase().includes(q)) return false;
    // roleFilter holds a role _id
    if (roleFilter) {
      const uRoleId = getRoleId(u);
      if (uRoleId !== roleFilter) return false;
    }
    return true;
  });

  const kpi = {
    total:   users.length,
    active:  users.filter(u => !u.isBlocked && u.status === "active").length,
    blocked: users.filter(u => u.isBlocked).length,
    admins:  users.filter(u => getRoleName(u) === "admin").length,
  };

  const openDrawer = (u) => { setSelected(u); setDrawer(true); };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: "#", key: "idx", width: 44, align: "center",
      render: (_, __, i) => (
        <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "JetBrains Mono" }}>{i + 1}</span>
      ),
    },
    {
      title: "User", key: "user",
      render: (_, u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={32} style={{
            background: u.isBlocked ? "rgba(239,68,68,0.12)" : "rgba(139,92,246,0.12)",
            color: u.isBlocked ? "#e53935" : "#7c3aed", fontSize: 13, fontWeight: 700,
            border: `1.5px solid ${u.isBlocked ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.25)"}`,
            flexShrink: 0,
          }}>
            {(u.email || "U")[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ color: "#1e293b", fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{u.email}</div>
            {u.isBlocked && (
              <span style={{ fontSize: 10, color: "#e53935", fontWeight: 600 }}>🚫 Blocked</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Role", key: "roleId", width: 130,
      render: (_, u) => <RoleBadge roleName={getRoleName(u)} />,
      filters: roles.map(r => ({ text: r.name, value: r._id })),
      onFilter: (value, record) => getRoleId(record) === value,
    },
    {
      title: "Complaints", dataIndex: "complaintCount", key: "cc", width: 105, align: "center",
      sorter: (a, b) => (a.complaintCount || 0) - (b.complaintCount || 0),
      render: v => (
        <span style={{
          fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 700,
          color: (v || 0) > 20 ? "#e53935" : "#1e293b",
        }}>{fmtNum(v || 0)}</span>
      ),
    },
    {
      title: "Joined", dataIndex: "createdAt", key: "joined", width: 105,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#64748b" }}>{fmtDate(v)}</span>,
    },
    {
      title: "Status", key: "status", width: 125,
      filters: [
        { text: "Active",    value: "active" },
        { text: "Pending",   value: "pending" },
        { text: "Suspended", value: "suspended" },
        { text: "Blocked",   value: "blocked" },
      ],
      onFilter: (value, record) =>
        value === "blocked" ? record.isBlocked : (!record.isBlocked && record.status === value),
      render: (_, u) => <StatusCell user={u} onStatusChange={changeStatus} />,
    },
      {
        title: "Change Role", key: "role_change", width: 150,
        render: (_, u) => (
          <span onClick={e => e.stopPropagation()}>
            <RoleChangeSelect
              user={u}
              roles={roles}
              currentRoleId={getRoleId(u)}
              disabled={u.isBlocked}
              onConfirm={roleId => changeUserRole(u._id, roleId)}
            />
          </span>
        ),
      },
    ...(canDelete || canEdit ? [{
      title: "Actions", key: "actions", width: 150, fixed: "right",
      render: (_, u) => (
        <Space size={6} onClick={e => e.stopPropagation()}>
          {canEdit && (
            <Tooltip title={u.isBlocked ? "Unblock user" : "Block user"}>
              <Popconfirm
                title={u.isBlocked ? "Unblock this user?" : "Block this user?"}
                description={u.isBlocked ? "User will regain complaint access." : "User will lose complaint access."}
                onConfirm={() => blockUser(u._id, u.isBlocked)}
                okText="Confirm"
              >
                <Button size="small"
                  icon={u.isBlocked ? <UnlockOutlined /> : <LockOutlined />}
                  style={{
                    background: u.isBlocked ? "rgba(22,163,74,0.08)" : "rgba(245,158,11,0.08)",
                    border: `1px solid ${u.isBlocked ? "rgba(22,163,74,0.25)" : "rgba(245,158,11,0.25)"}`,
                    color: u.isBlocked ? "#16a34a" : "#d97706",
                    borderRadius: 8, fontSize: 12, fontWeight: 600,
                  }}
                >
                  {u.isBlocked ? "Unblock" : "Block"}
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete user">
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
            </Tooltip>
          )}
        </Space>
      ),
    }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI cards with equal heights ─────────────────────────────────── */}
      <Row gutter={[14, 14]} align="stretch">
        {[
          { label: "Total Users",  value: kpi.total,   color: "#2563eb", bg: "rgba(37,99,235,0.08)",  border: "rgba(37,99,235,0.2)",  icon: "", sub: `${users.length} registered` },
          { label: "Active",       value: kpi.active,  color: "#16a34a", bg: "rgba(22,163,74,0.08)",  border: "rgba(22,163,74,0.2)",  icon: "", sub: "Access granted" },
          { label: "Blocked",      value: kpi.blocked, color: "#e53935", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  icon: "", sub: "Access restricted" },
          { label: "Admins",       value: kpi.admins,  color: "#7c3aed", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)", icon: "", sub: "Admin role users" },
        ].map(card => (
          <Col xs={12} sm={6} key={card.label} style={{ display: "flex" }}>
            <div style={{
              flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "16px 18px", borderRadius: 14,
              background: card.bg, border: `1.5px solid ${card.border}`,
              minHeight: 90,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: card.color,
                  textTransform: "uppercase", letterSpacing: 0.8 }}>{card.label}</div>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b",
                  fontFamily: "JetBrains Mono", lineHeight: 1.1 }}>{fmtNum(card.value)}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{card.sub}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        padding: "12px 14px", borderRadius: 12,
        background: "#fff", border: "1.5px solid #e8ecf0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search by email or role…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, borderRadius: 8 }}
          allowClear
        />
        <Select
          value={roleFilter || undefined}
          onChange={v => setRole(v || "")}
          allowClear placeholder="All Roles"
          style={{ minWidth: 140 }}
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
          style={{ borderRadius: 8, borderColor: "#e2e8f0", color: "#64748b" }}
        >
          Refresh
        </Button>

        {/* Only system roles see role management */}
        {loggedUser?.isSystemRole && (
          <>
            <Divider type="vertical" style={{ height: 24, margin: "0 2px" }} />
            <Button
              icon={<EyeOutlined />}
              onClick={() => setViewRolesModal(true)}
              style={{
                borderRadius: 8,
                background: "rgba(6,182,212,0.07)",
                border: "1.5px solid rgba(6,182,212,0.28)",
                color: "#0891b2", fontWeight: 700,
              }}
            >
              View Roles
            </Button>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={openAddRole}
              style={{
                borderRadius: 8,
                background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                border: "none", fontWeight: 700,
                boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
              }}
            >
              Add Role
            </Button>
          </>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 14, overflow: "hidden",
        border: "1.5px solid #e8ecf0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        background: "#fff",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>
              Manage Users
            </span>
            <span style={{
              padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: "rgba(37,99,235,0.08)", color: "#2563eb",
              border: "1px solid rgba(37,99,235,0.2)",
            }}>
              {fmtNum(filtered.length)}
            </span>
          </div>
          {roleFilter && (
            <Button size="small" type="link" onClick={() => setRole("")}
              style={{ color: "#94a3b8", fontSize: 12 }}>
              Clear filter ✕
            </Button>
          )}
        </div>

        <Table
          dataSource={filtered} columns={columns}
          rowKey={u => u._id} size="middle" loading={loading}
          className="pg-table"
          pagination={{
            pageSize: 12, showSizeChanger: true,
            showTotal: t => <span style={{ color: "#64748b", fontSize: 13 }}>{fmtNum(t)} total</span>,
          }}
          scroll={{ x: 1100 }}
          rowClassName={() => "pg-table-row"}
          onRow={u => ({
            style: { cursor: "pointer", opacity: u.isBlocked ? 0.72 : 1 },
            onClick: () => openDrawer(u),
          })}
        />
      </div>

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen} onClose={() => setDrawer(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar size={40} style={{
              background: "rgba(139,92,246,0.12)", color: "#7c3aed",
              fontWeight: 700, fontSize: 15, border: "1.5px solid rgba(139,92,246,0.25)",
            }}>
              {(selected?.email || "U")[0].toUpperCase()}
            </Avatar>
            <div>
              <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{selected?.email}</div>
              <RoleBadge roleName={selected ? getRoleName(selected) : "user"} />
            </div>
          </div>
        }
        styles={{
          header: { background: "#fafbfc", borderBottom: "1px solid #f0f2f5", paddingTop: 16, paddingBottom: 16 },
          body:   { background: "#fafbfc", padding: 18 },
        }}
        width={390}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Detail rows */}
            {[
              ["Email",  selected.email,                                                     true],
              ["Role",   getRoleName(selected),                                              false],
              ["Status", selected.isBlocked ? "Blocked" : (selected.status || "active"),   false],
              ["Joined", fmtDT(selected.createdAt),                                         false],
            ].map(([label, value, mono]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                gap: 8, padding: "10px 0", borderBottom: "1px solid #f1f5f9",
              }}>
                <span style={{
                  color: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono",
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

            {/* Complaint stats */}
            {selected.stats && (
              <div style={{
                margin: "14px 0 0", padding: 14,
                borderRadius: 12, background: "#fff", border: "1.5px solid #e8ecf0",
              }}>
                <div style={{ color: "#1e293b", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>📊 Complaint Stats</div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", borderRadius: 8, background: "#f8fafc",
                  border: "1px solid #e8ecf0", marginBottom: 12,
                }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", fontFamily: "JetBrains Mono" }}>
                    {fmtNum(selected.stats.totalComplaints || 0)}
                  </span>
                </div>
                {[
                  { label: "⏳ Pending",  val: selected.stats.pendingComplaints,  stroke: "#f59e0b", trail: "#fef3c7", color: "#d97706" },
                  { label: "✅ Resolved", val: selected.stats.resolvedComplaints, stroke: "#16a34a", trail: "#dcfce7", color: "#16a34a" },
                ].map(({ label, val, stroke, trail, color }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "JetBrains Mono" }}>
                        {fmtNum(val || 0)}
                      </span>
                    </div>
                    <Progress
                      percent={selected.stats.totalComplaints ? Math.round(((val || 0) / selected.stats.totalComplaints) * 100) : 0}
                      showInfo={false} strokeColor={stroke} trailColor={trail} size="small"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>

              {/* Status change */}
              {!selected.isBlocked && (NEXT_STATUSES[selected.status] || []).length > 0 && (
                <div style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: "#fff", border: "1.5px solid #e8ecf0",
                }}>
                  <div style={{
                    fontSize: 10, color: "#94a3b8", fontWeight: 700,
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

              {/* Role change */}
              {loggedUser?.isSystemRole && (
                <div style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: "#fff", border: "1.5px solid #e8ecf0",
                }}>
                  <div style={{
                    fontSize: 10, color: "#94a3b8", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
                  }}>Change Role</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {roles.map(r => {
                      const isCurrent = getRoleId(selected) === r._id || selected.role === r.name;
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
              )}

              {/* Block / Unblock */}
              {canEdit && (
                <Popconfirm
                  title={selected.isBlocked ? "Unblock this user?" : "Block this user?"}
                  description={selected.isBlocked ? "User will regain access." : "User will lose complaint access."}
                  onConfirm={() => blockUser(selected._id, selected.isBlocked)}
                  okText="Confirm"
                >
                  <Button block style={{
                    background: selected.isBlocked ? "rgba(22,163,74,0.07)" : "rgba(245,158,11,0.07)",
                    border: `1.5px solid ${selected.isBlocked ? "rgba(22,163,74,0.3)" : "rgba(245,158,11,0.3)"}`,
                    color: selected.isBlocked ? "#16a34a" : "#d97706",
                    borderRadius: 10, fontWeight: 700, height: 42, fontSize: 13,
                  }}>
                    {selected.isBlocked ? "✅  Unblock User" : "🚫  Block User"}
                  </Button>
                </Popconfirm>
              )}

              {/* Delete */}
              {canDelete && (
                <Popconfirm
                  title="Permanently delete this user?"
                  description="This action cannot be undone."
                  onConfirm={() => deleteUser(selected._id)}
                  okText="Delete" okButtonProps={{ danger: true }}
                >
                  <Button block danger style={{
                    background: "rgba(239,68,68,0.05)",
                    border: "1.5px solid rgba(239,68,68,0.2)",
                    color: "#e53935", borderRadius: 10, fontWeight: 700, height: 42, fontSize: 13,
                  }}>
                    🗑  Delete User
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Role Form modal (Add + Edit) ──────────────────────────────────── */}
      <RoleFormModal
        open={roleFormModal}
        onConfirm={handleRoleFormSubmit}
        onCancel={() => { setRoleFormModal(false); setEditingRole(null); }}
        loading={roleFormLoading}
        initialData={editingRole}
      />

      {/* ── View Roles modal ──────────────────────────────────────────────── */}
      <ViewRolesModal
        open={viewRolesModal}
        onClose={() => setViewRolesModal(false)}
        roles={roles}
        rolesLoading={rolesLoading}
        onEditRole={openEditRole}
        onDeleteRole={handleDeleteRole}
      />
    </div>
  );
}