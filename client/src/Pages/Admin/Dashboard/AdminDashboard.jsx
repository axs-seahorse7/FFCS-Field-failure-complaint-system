import { useState, useCallback } from "react";
import { Layout, Menu, Avatar, Button, Dropdown, Space, Tooltip, Badge } from "antd";
import {
  DashboardOutlined, BugOutlined, TeamOutlined, SafetyOutlined,
  ThunderboltOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, FileTextOutlined, SettingOutlined, UserSwitchOutlined
} from "@ant-design/icons";
import OverviewSection   from "./sections/OverviewSection";
import DefectsSection    from "./sections/DefectsSection";
import CustomersSection  from "./sections/CustomersSection";
import WarrantySection   from "./sections/WarrantySection";
import ActionsSection    from "./sections/ActionsSection";
import RegisterSection   from "./sections/RegisterSection";
import ManageSection     from "./sections/ManageSection";
import UsersSection      from "./sections/UsersSection";
import Toast             from "./components/Toast";
import "./dashboard.css";

const { Sider, Content, Header } = Layout;

const NAV_ITEMS = [
  { key: "overview",   icon: <DashboardOutlined />,   label: "Overview" },
  { key: "defects",    icon: <BugOutlined />,          label: "Defect Analysis" },
  { key: "customers",  icon: <TeamOutlined />,          label: "Customer Wise" },
  { key: "warranty",   icon: <SafetyOutlined />,        label: "Warranty & PPM" },
  { key: "actions",    icon: <ThunderboltOutlined />,   label: "Action Plans" },
  { type: "divider" },
  { key: "register",   icon: <FileTextOutlined />,      label: "Complaint Register" },
  { key: "manage",     icon: <SettingOutlined />,       label: "Manage Complaints" },
  { key: "users",      icon: <UserSwitchOutlined />,    label: "Manage Users" },
];

const SECTION_META = {
  overview:  { label: "Overview",            icon: "📊", desc: "System health & complaint trends" },
  defects:   { label: "Defect Analysis",     icon: "🔧", desc: "Root cause insights & failure patterns" },
  customers: { label: "Customer Wise",        icon: "🏢", desc: "Brand comparison & performance" },
  warranty:  { label: "Warranty & PPM",       icon: "📦", desc: "Quality metrics & reliability tracking" },
  actions:   { label: "Action Plans",         icon: "⚡", desc: "Operations, execution & SLA tracking" },
  register:  { label: "Complaint Register",   icon: "📋", desc: "Full complaint log & drill-down" },
  manage:    { label: "Manage Complaints",    icon: "⚙️", desc: "Update status, delete, search" },
  users:     { label: "Manage Users",         icon: "👥", desc: "Block, unblock, roles & activity" },
};

export default function AdminDashboard({ userEmail }) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive]       = useState("overview");
  const [toasts, setToasts]       = useState([]);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("token");
      window.location.href = "/";
    } catch (e) { console.error(e); }
  };

  const meta = SECTION_META[active];

  const renderSection = () => {
    switch (active) {
      case "overview":  return <OverviewSection  addToast={addToast} />;
      case "defects":   return <DefectsSection   addToast={addToast} />;
      case "customers": return <CustomersSection addToast={addToast} />;
      case "warranty":  return <WarrantySection  addToast={addToast} />;
      case "actions":   return <ActionsSection   addToast={addToast} />;
      case "register":  return <RegisterSection  addToast={addToast} />;
      case "manage":    return <ManageSection    addToast={addToast} />;
      case "users":     return <UsersSection     addToast={addToast} />;
      default: return null;
    }
  };

  const userMenu = {
    items: [
      { key: "email", label: <span style={{ color: "#64748b", fontSize: 13 }}>{userEmail || "admin@pg.com"}</span>, disabled: true },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Logout", danger: true, onClick: handleLogout },
    ]
  };

  return (
    <Layout className="pg-root" style={{ minHeight: "100vh" }}>

      {/* ══ SIDEBAR ══ */}
      <Sider
        className="pg-sider"
        collapsed={collapsed}
        trigger={null}
        width={230}
        collapsedWidth={68}
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e8ecf0",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflow: "auto",
        }}
      >
        {/* Brand */}
        <div style={{
          padding: collapsed ? "18px 16px" : "18px 20px",
          borderBottom: "1px solid #f0f2f5",
          display: "flex", alignItems: "center", gap: 12,
          transition: "padding 0.2s",
          background: "#fff",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #e53935, #b71c1c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(229,57,53,0.3)",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>PG</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: "#1e293b", fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>PG GROUP</div>
              <div style={{ color: "#e53935", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>ADMIN CONSOLE</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ padding: "8px 0", flex: 1 }}>
          {!collapsed && (
            <div style={{ padding: "12px 20px 4px", color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
              Analytics
            </div>
          )}
          <Menu
            mode="inline"
            selectedKeys={[active]}
            onClick={({ key }) => { if (key !== "divider") setActive(key); }}
            className="pg-nav"
            style={{ background: "transparent", border: "none" }}
            items={NAV_ITEMS.filter(i => i.key !== undefined || i.type === "divider").map(i =>
              i.type === "divider"
                ? { type: "divider", key: "div1" }
                : i
            )}
          />
          {!collapsed && (
            <div style={{ padding: "12px 20px 4px", color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>
              Management
            </div>
          )}
        </div>

        {/* User footer */}
        <div style={{
          borderTop: "1px solid #f0f2f5",
          padding: collapsed ? "14px 12px" : "14px 16px",
          background: "#fafbfc",
        }}>
          {!collapsed ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Avatar size={30} style={{ background: "rgba(229,57,53,0.1)", color: "#e53935", fontWeight: 700, fontSize: 12, border: "1.5px solid rgba(229,57,53,0.2)" }}>
                  {(userEmail || "A")[0].toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{userEmail || "admin"}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>Administrator</div>
                </div>
              </div>
              <Button block size="small" onClick={handleLogout} icon={<LogoutOutlined />}
                style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff1f0", borderColor: "#fecaca", color: "#e53935" }}>
                Logout
              </Button>
            </div>
          ) : (
            <Tooltip title="Logout" placement="right">
              <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}
                style={{ color: "#e53935", width: "100%" }} />
            </Tooltip>
          )}
        </div>
      </Sider>

      {/* ══ MAIN ══ */}
      <Layout style={{ background: "#f5f6fa" }}>
        {/* Header */}
        <Header style={{
          background: "#ffffff", padding: "0 24px", height: 60,
          borderBottom: "1px solid #e8ecf0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Button type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(c => !c)}
              style={{ color: "#64748b", fontSize: 18, width: 38, height: 38 }}
            />
            <div>
              <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                {meta.icon} {meta.label}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 1 }}>{meta.desc}</div>
            </div>
          </div>

          <Space size={10}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, height:30, padding: "0px 14px", borderRadius: 20,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              color: "#16a34a", fontSize: 12, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pgpulse 2s infinite" }} />
              LIVE
            </div>
            <style>{`@keyframes pgpulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

            <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
              <Avatar size={34}
                style={{ background: "#fff1f0", border: "1.5px solid #fecaca", color: "#e53935", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                {(userEmail || "A")[0].toUpperCase()}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content style={{ padding: 24, minHeight: "calc(100vh - 60px)" }}>
          {renderSection()}
        </Content>
      </Layout>

      <Toast toasts={toasts} />
    </Layout>
  );
}
