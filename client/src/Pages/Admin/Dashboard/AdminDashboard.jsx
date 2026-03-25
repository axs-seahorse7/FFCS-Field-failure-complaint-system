import { useState, useCallback, useMemo } from "react";
import { Layout, Menu, Avatar, Button, Dropdown, Space, Tooltip, Drawer, Select, DatePicker, Divider } from "antd";
import {
  DashboardOutlined, BugOutlined, TeamOutlined, SafetyOutlined,
  ThunderboltOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, FileTextOutlined, SettingOutlined, UserSwitchOutlined,
  FilterOutlined, CloseOutlined, ReloadOutlined,
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
const { RangePicker } = DatePicker;
const { Option } = Select;

const CUSTOMERS = ["GODREJ","HAIER","AMSTRAD","ONIDA","MARQ","CROMA","VOLTAS","BLUE STAR","BPL","SAMSUNG","LG","WHIRLPOOL","CMI"];

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
  overview:  { label: "Overview",            desc: "System health & complaint trends" },
  defects:   { label: "Defect Analysis",     desc: "Root cause insights & failure patterns" },
  customers: { label: "Customer Wise",        desc: "Brand comparison & performance" },
  warranty:  { label: "Warranty & PPM",       desc: "Quality metrics & reliability tracking" },
  actions:   { label: "Action Plans",         desc: "Operations, execution & SLA tracking" },
  register:  { label: "Complaint Register",   desc: "Full complaint log & drill-down" },
  manage:    { label: "Manage Complaints",    desc: "Update status, delete, search" },
  users:     { label: "Manage Users",         desc: "Block, unblock, roles & activity" },
};

export default function AdminDashboard({ userEmail }) {
  const [collapsed, setCollapsed]       = useState(true);
  const [active, setActive]             = useState("overview");
  const [toasts, setToasts]             = useState([]);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterDateRange, setFilterDateRange] = useState(null);
  const [appliedFilters, setAppliedFilters]   = useState({});

  const user = JSON.parse(localStorage.getItem("User") || "{}");

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

  const handleApplyFilters = () => {
    const f = {};
    if (filterCustomer) f.customerName = filterCustomer;
    if (filterDateRange?.[0]) f.from = filterDateRange[0].toISOString();
    if (filterDateRange?.[1]) f.to   = filterDateRange[1].toISOString();
    setAppliedFilters(f);
    setFilterOpen(false);
    addToast("Filters applied", "success");
  };

  const handleClearFilters = () => {
    setFilterCustomer("");
    setFilterDateRange(null);
    setAppliedFilters({});
    addToast("Filters cleared", "info");
  };

  const activeFilterCount = Object.keys(appliedFilters).length;
  const meta = SECTION_META[active];

  const renderSection = () => {
    switch (active) {
      case "overview":  return <OverviewSection  addToast={addToast} filters={appliedFilters} />;
      case "defects":   return <DefectsSection   addToast={addToast} filters={appliedFilters} />;
      case "customers": return <CustomersSection addToast={addToast} filters={appliedFilters} />;
      case "warranty":  return <WarrantySection  addToast={addToast} filters={appliedFilters} />;
      case "actions":   return <ActionsSection   addToast={addToast} filters={appliedFilters} />;
      case "register":  return <RegisterSection  addToast={addToast} filters={appliedFilters} />;
      case "manage":    return <ManageSection    addToast={addToast} filters={appliedFilters} />;
      case "users":     return <UsersSection     addToast={addToast} filters={appliedFilters} />;
      default: return null;
    }
  };

  const userMenu = {
    items: [
      { key: "email", label: <span style={{ color: "#64748b", fontSize: 12 }}>{user?.email || "admin@pg.com"}</span>, disabled: true },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Logout", danger: true, onClick: handleLogout },
    ]
  };

  const menuItems = useMemo(() => {
  return NAV_ITEMS.filter(i => i.key !== undefined || i.type === "divider")
    .map(i => i.type === "divider" ? { type: "divider", key: "div1" } : i);
}, []);

  return (
<Layout className="pg-root" style={{ minHeight: "100vh" }}>
  <Sider
    className="pg-sider"
    collapsible
    collapsed={collapsed}
    trigger={null}
    width={220}
    collapsedWidth={64}
    style={{
      background: "#ffffff",
      borderRight: "1px solid #e8ecf0",
      height: "100vh",
      position: "sticky",
      left: 0,
      top: 0,
      bottom: 0,
      overflow: "hidden",
      willChange: "width",
      transform: "translateZ(0)",
      backfaceVisibility: "hidden",
      
    }}
  >
    {/* ══ BRAND ══ */}
    <div
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid #f0f2f5",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#ECE7D1",
        minHeight: 56,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/pg-logo-Photoroom (1).png"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Smooth GPU animation */}
      <div
        style={{
          transform: collapsed ? "scaleX(0)" : "scaleX(1)",
          transformOrigin: "left",
          opacity: collapsed ? 0 : 1,
          transition: "transform 0.2s ease, opacity 0.2s ease",
          willChange: "transform, opacity",
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            color: "#1e293b",
            fontWeight: 800,
            fontSize: 14,
            lineHeight: 1.2,
          }}
        >
          PG <span style={{ color: "#b91c1c" }}>GROUP</span>
        </div>
        <div
          style={{
            color: "#e53935",
            fontSize: 9,
            fontFamily: "'JetBrains Mono',monospace",
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginTop: 1,
          }}
        >
          ADMIN CONSOLE
        </div>
      </div>
    </div>

    {/* ══ NAV ══ */}
    <div style={{ padding: "6px 0", flex: 1 }}>
      {/* Section Label */}
      <div
        style={{
          // transform: collapsed ? "scaleY(0)" : "scaleY(1)",
          // transformOrigin: "top",
          opacity: collapsed ? 0 : 1,
          // transition: "transform 0.2s ease, opacity 0.2s ease",
          willChange: "transform, opacity",
          // padding: "10px 18px 3px",
        }}
      >
        <span
          style={{
            color: "#94a3b8",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono',monospace",
            whiteSpace: "nowrap",
          }}
        >
          Analytics
        </span>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[active]}
        onClick={({ key }) => key !== "divider" && setActive(key)}
        motion={false}
        style={{
          background: "transparent",
          border: "none",
          paddingRight: 10,
        }}
        items={menuItems}
      />

      {/* Management Label */}
      <div
        style={{
          transform: collapsed ? "scaleY(0)" : "scaleY(1)",
          transformOrigin: "top",
          opacity: collapsed ? 0 : 1,
          transition: "transform 0.2s ease, opacity 0.2s ease",
          willChange: "transform, opacity",
          padding: "10px 18px 3px",
        }}
      >
        <span
          style={{
            color: "#94a3b8",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono',monospace",
            whiteSpace: "nowrap",
          }}
        >
          Management
        </span>
      </div>
    </div>

    {/* ══ FOOTER ══ */}
    <div
      style={{
        borderTop: "1px solid #f0f2f5",
        padding: "12px",
        background: "#fafbfc",
      }}
    >
      {/* Expanded */}
      <div
        style={{
          transform: collapsed ? "scaleY(0)" : "scaleY(1)",
          transformOrigin: "bottom",
          opacity: collapsed ? 0 : 1,
          transition: "transform 0.2s ease, opacity 0.2s ease",
          willChange: "transform, opacity",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Avatar
            size={28}
            style={{
              background: "rgba(229,57,53,0.1)",
              color: "#e53935",
              fontWeight: 700,
              fontSize: 11,
              border: "1.5px solid rgba(229,57,53,0.2)",
            }}
          >
            {(userEmail || "A")[0].toUpperCase()}
          </Avatar>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#1e293b",
                fontSize: 12,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 120,
              }}
            >
              {userEmail || "admin"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 10 }}>
              Administrator
            </div>
          </div>
        </div>

        <Button
          block
          size="small"
          onClick={handleLogout}
          icon={<LogoutOutlined />}
          style={{
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: "#fff1f0",
            borderColor: "#fecaca",
            color: "#e53935",
          }}
        >
          Logout
        </Button>
      </div>

      {/* Collapsed Icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: collapsed ? 0 : -40,
          opacity: collapsed ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <Tooltip title="Logout" placement="right">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: "#e53935" }}
          />
        </Tooltip>
      </div>
    </div>
  </Sider>

      {/* ══ MAIN ══ */}
      <Layout style={{ background: "#f5f6fa" }}>

        {/* ── Header ── */}
        <Header style={{
          background: "#ffffff", padding: "0 20px", height: 54,
          borderBottom: "1px solid #e8ecf0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(c => !c)}
              style={{ color: "#64748b", fontSize: 16, width: 34, height: 34 }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.5 }}>
              <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 15 }}>{meta.label}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{meta.desc}</div>
            </div>
          </div>

          <Space size={8}>
            {/* LIVE badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 12px", borderRadius: 20,
              background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a",
              fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pgpulse 2s infinite" }} />
              LIVE
            </div>
            <style>{`@keyframes pgpulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

            {/* Filter Button */}
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterOpen(true)}
              style={{
                borderRadius: 8, fontSize: 12, fontWeight: 600, height: 32,
                background: activeFilterCount > 0 ? "#fff1f0" : "#f8fafc",
                borderColor: activeFilterCount > 0 ? "#fecaca" : "#e2e8f0",
                color: activeFilterCount > 0 ? "#e53935" : "#64748b",
              }}
            >
              Filters {activeFilterCount > 0 && <span style={{
                marginLeft: 4, background: "#e53935", color: "#fff",
                borderRadius: "50%", width: 16, height: 16, fontSize: 10,
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
              }}>{activeFilterCount}</span>}
            </Button>

            <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
              <Avatar size={32}
                style={{ background: "#fff1f0", border: "1.5px solid #fecaca", color: "#e53935", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                {(userEmail || "A")[0].toUpperCase()}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>

        {/* ── Content ── */}
        <Content style={{ padding: 16, minHeight: "calc(100vh - 54px)" }}>
          {renderSection()}
        </Content>
      </Layout>

      {/* ══ GLOBAL FILTER DRAWER ══ */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FilterOutlined style={{ color: "#e53935" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Filter Dashboard</span>
          </div>
        }
        placement="top"
        height={220}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        closeIcon={<CloseOutlined style={{ fontSize: 13 }} />}
        styles={{
          header: { background: "#fafbfc", borderBottom: "1px solid #f0f2f5", padding: "12px 20px" },
          body: { padding: "16px 20px", background: "#fff" },
        }}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "8px 0" }}>
            <Button size="small" onClick={handleClearFilters} icon={<ReloadOutlined />}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 12, borderColor: "#e2e8f0" }}>
              Clear All
            </Button>
            <Button size="small" type="primary" onClick={handleApplyFilters}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 12, background: "#e53935", borderColor: "#e53935" }}>
              Apply Filters
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Date Range</div>
            <RangePicker
              value={filterDateRange}
              onChange={setFilterDateRange}
              style={{ borderRadius: 8, fontSize: 12, minWidth: 240 }}
              size="small"
              placeholder={["From date", "To date"]}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Customer</div>
            <Select
              className="pg-select"
              placeholder="All Customers"
              allowClear
              value={filterCustomer || undefined}
              style={{ minWidth: 180 }}
              onChange={v => setFilterCustomer(v || "")}
              size="small"
            >
              {CUSTOMERS.map(c => <Option key={c}>{c}</Option>)}
            </Select>
          </div>
          {activeFilterCount > 0 && (
            <div style={{ fontSize: 12, color: "#e53935", fontWeight: 600, paddingBottom: 2 }}>
              ✓ {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
            </div>
          )}
        </div>
      </Drawer>

      <Toast toasts={toasts} />
    </Layout>
  );
}