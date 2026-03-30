import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Outlet, } from "react-router-dom";
import { Layout, Menu, Avatar, Button, Dropdown, Space, Tooltip, Drawer, Select, DatePicker } from "antd";
import { DashboardOutlined, BugOutlined, TeamOutlined, SafetyOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, FileTextOutlined, SettingOutlined, UserSwitchOutlined, FilterOutlined, CloseOutlined, ReloadOutlined, CalendarOutlined, UploadOutlined, FilePptOutlined ,
} from "@ant-design/icons";
import Toast from "./components/Toast";
import "./dashboard.css";
import api from "../../../services/axios-interceptore/api";

const { Sider, Content, Header } = Layout;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CUSTOMERS    = ["GODREJ","HAIER","AMSTRAD","ONIDA","MARQ","CROMA","VOLTAS","BLUE STAR","BPL","SAMSUNG","LG","WHIRLPOOL","CMI"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const NAV_ITEMS = [
  { key: "overview", label: "Overview", permission: "overview", icon: <DashboardOutlined /> },
  { key: "defects", label: "Defect Analysis", permission: "defects", icon: <BugOutlined /> },
  { key: "customers", label: "Customer Wise", permission: "customers", icon: <TeamOutlined /> },
  { key: "warranty", label: "Warranty & PPM", permission: "warranty", icon: <SafetyOutlined /> },

  { type: "divider" },

  { key: "register", label: "Complaint Register", permission: "register", icon: <FileTextOutlined /> },
  { key: "manage", label: "Manage Complaints", permission: "manage", icon: <SettingOutlined /> },
  { key: "users", label: "Manage Users", permission: "users", icon: <UserSwitchOutlined /> },
  { key: "production", label: "Production", permission: "production", icon: <FilePptOutlined /> },
  { key: "bulk-upload", label: "Bulk Upload", permission: "bulk-upload", icon: <UploadOutlined /> },
];

const SECTION_META = {
  overview:     { label: "Overview",           desc: "System health & complaint trends" },
  defects:      { label: "Defect Analysis",    desc: "Root cause insights & failure patterns" },
  customers:    { label: "Customer Wise",       desc: "Brand comparison & performance" },
  warranty:     { label: "Warranty & PPM",      desc: "Quality metrics & reliability tracking" },
  register:     { label: "Complaint Register",  desc: "Full complaint log & drill-down" },
  manage:       { label: "Manage Complaints",   desc: "Update status, delete, search" },
  users:        { label: "Manage Users",        desc: "Block, unblock, roles & activity" },
  production:   { label: "Manage Production",   desc: "Create, update, and delete production records" },
  "bulk-upload":{ label: "Bulk Upload",         desc: "Upload complaints in bulk" },
};


export default function AdminDashboard({ userEmail }) {
  const [collapsed, setCollapsed]     = useState(true);
  const [toasts, setToasts]           = useState([]);
  const [filterOpen, setFilterOpen]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  // Derive active key from URL: /dashboard/defects → "defects"
  const user = JSON.parse(localStorage.getItem("User") || "{}");
  const active = location.pathname.split("/")[2] || "overview";
  const meta = SECTION_META[active || "overview"];
  
  
  // ── Year state ──
  const [selectedYear,    setSelectedYear]    = useState(CURRENT_YEAR);
  const [filterCustomer,  setFilterCustomer]  = useState("");
  const [filterDateRange, setFilterDateRange] = useState(null);
  const [extraFilters,    setExtraFilters]    = useState({});


  const appliedFilters = useMemo(() => ({
    year: selectedYear,
    ...extraFilters,
  }), [selectedYear, extraFilters]);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const handleLogout = async () => {
    try {
      console.log("Attempting logout for user:", user?.email);
      await api.post("/auth/logout");
      navigate("/", { replace: true });
    } catch (e) { console.error(e); }
  };

  const handleYearChange = (y) => {
    setSelectedYear(y);
    setExtraFilters({});
    setFilterCustomer("");
    setFilterDateRange(null);
  };

  const handleApplyFilters = () => {
    const f = {};
    if (filterCustomer)      f.customerName = filterCustomer;
    if (filterDateRange?.[0]) f.from = filterDateRange[0].toISOString();
    if (filterDateRange?.[1]) f.to   = filterDateRange[1].toISOString();
    setExtraFilters(f);
    setFilterOpen(false);
    addToast("Filters applied", "success");
  };

  const handleClearDrawer = () => {
    setFilterCustomer("");
    setFilterDateRange(null);
    setExtraFilters({});
    addToast("Extra filters cleared", "info");
  };

  const extraFilterCount = Object.keys(extraFilters).length;

    const permissions = user?.roleId?.permissions || [];
    const menuItems = useMemo(() => {
      if (user?.isSystemRole) return NAV_ITEMS;
      return NAV_ITEMS.filter(item =>
        !item.permission || permissions.includes(item.permission)
      );
    }, [user]);

  const userMenu = {
    items: [
      { key: "email", label: <span style={{ color: "#64748b", fontSize: 12 }}>{user?.email }</span>, disabled: true },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Logout", danger: true, onClick: handleLogout },
    ]
  };

  useEffect(() => {
  if (!active && permissions.length) {
    const firstAllowed = NAV_ITEMS.find(item =>
      permissions.includes(item.permission)
    );

    if (firstAllowed) {
      navigate(`/dashboard/${firstAllowed.key}`, { replace: true });
    }
  }
}, [active, permissions]);

  return (
    <Layout className="pg-root" style={{ minHeight: "100vh" }}>

      {/* ══ SIDEBAR ══ */}
      <Sider
        className="pg-sider"
        collapsible collapsed={collapsed} trigger={null}
        width={220} collapsedWidth={64}
        style={{
          background: "#ffffff", borderRight: "1px solid #e8ecf0",
          height: "100vh", position: "sticky", top: 0,
          overflow: "hidden", willChange: "width",
        }}
      >
        {/* Brand */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid #f0f2f5",
          display: "flex", alignItems: "center", gap: 10,
          background: "", minHeight: 56,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/pg-logo-Photoroom (1).png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{
            opacity: collapsed ? 0 : 1, transition: "opacity 0.2s",
            whiteSpace: "nowrap", overflow: "hidden",
          }}>
            <div style={{ color: "#1e293b", fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
              PG <span style={{ color: "#b91c1c" }}>GROUP</span>
            </div>
            <div style={{ color: "#e53935", fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>
              ADMIN CONSOLE
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "6px 0" }}>
          {!collapsed && (
            <div style={{ padding: "10px 18px 3px", color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
              Analytics
            </div>
          )}

          <Menu
            mode="inline"
            selectedKeys={[active]}
            onClick={({ key }) => key !== "divider" && navigate(`/dashboard/${key}`)}
            style={{ background: "transparent", border: "none", paddingRight: 10 }}
            items={menuItems}
          />
          {!collapsed && (
            <div style={{ padding: "10px 18px 3px", color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
              Management
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #f0f2f5", padding: "12px", background: "#fafbfc", position: "absolute", bottom: 0, width: "100%" }}>
          {!collapsed ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Avatar size={28} style={{ background: "rgba(229,57,53,0.1)", color: "#e53935", fontWeight: 700, fontSize: 11, border: "1.5px solid rgba(229,57,53,0.2)" }}>
                  {(userEmail || "A")[0].toUpperCase()}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#1e293b", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{userEmail || "admin"}</div>
                  <div style={{ color: "#94a3b8", fontSize: 10 }}>Administrator</div>
                </div>
              </div>
              <Button block size="small" onClick={handleLogout} icon={<LogoutOutlined />}
                style={{ borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#fff1f0", borderColor: "#fecaca", color: "#e53935" }}>
                Logout
              </Button>
            </div>
          ) : (
            <Tooltip title="Logout" placement="right">
              <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: "#e53935", width: "100%" }} />
            </Tooltip>
          )}
        </div>
      </Sider>

      {/* ══ MAIN ══ */}
      <Layout style={{ background: "#f5f6fa" }}>

        {/* Header */}
        <Header style={{
          background: "linear-gradient(to right, #f0f2f5, #e8ecf0)", padding: "0 20px", height: 54,
          borderBottom: "1px solid #e8ecf0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", height: "100%", alignItems: "center", gap: 12 }}>
            <Button type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(c => !c)}
              style={{ color: "#64748b", fontSize: 16, width: 34, height: 34 }}
            />
            <span className="font-semibold text-cyan-700  ">{meta.label}</span>
            
            <span className="text-[12px] text-slate-500 max-lg:hidden ">{" • "}{meta.desc}</span>
          </div>

          <Space size={8}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 12px", borderRadius: 20,
              background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a",
              fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pgpulse 2s infinite" }} />
              LIVE
            </div>
            <style>{`@keyframes pgpulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "0 10px", height: 32,
            }}>
              <CalendarOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Year</span>
              <Select
                size="small" value={selectedYear} onChange={handleYearChange}
                variant="borderless" style={{ width: 68, fontSize: 12, fontWeight: 700 }}
                popupMatchSelectWidth={false}
              >
                {YEAR_OPTIONS.map(y => (
                  <Option key={y} value={y}>
                    <span style={{ fontWeight: y === CURRENT_YEAR ? 700 : 400 }}>{y}</span>
                  </Option>
                ))}
              </Select>
            </div>

            <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
              <Avatar size={32} style={{ background: "#fff1f0", border: "1.5px solid #fecaca", color: "#e53935", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                {(userEmail || "A")[0].toUpperCase()}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>

        {/* ── Content: Outlet renders the matched child route ── */}
        <Content style={{ padding: 16, minHeight: "calc(100vh - 54px)", paddingBottom: 40 }}>
          <Outlet context={{ addToast, filters: appliedFilters }} />
        </Content>
      </Layout>

      {/* Filter Drawer (unchanged) */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FilterOutlined style={{ color: "#e53935" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Additional Filters</span>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
              — Currently viewing: <strong style={{ color: "#e53935" }}>{selectedYear}</strong>
            </span>
          </div>
        }
        placement="top" style={{ height: 200 }}
        open={filterOpen} onClose={() => setFilterOpen(false)}
        closeIcon={<CloseOutlined style={{ fontSize: 13 }} />}
        styles={{
          header: { background: "#fafbfc", borderBottom: "1px solid #f0f2f5", padding: "12px 20px" },
          body:   { padding: "16px 20px", background: "#fff" },
          footer: { padding: "8px 20px", borderTop: "1px solid #f0f2f5", background: "#fafbfc" },
        }}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button size="small" onClick={handleClearDrawer} icon={<ReloadOutlined />}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 12, borderColor: "#e2e8f0" }}>
              Clear
            </Button>
            <Button size="small" type="primary" onClick={handleApplyFilters}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 12, background: "#e53935", borderColor: "#e53935" }}>
              Apply
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>Customer</div>
            <Select className="pg-select" placeholder="All Customers" allowClear value={filterCustomer || undefined}
              style={{ minWidth: 180 }} onChange={v => setFilterCustomer(v || "")} size="small">
              {CUSTOMERS.map(c => <Option key={c}>{c}</Option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Custom Date Range <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>(overrides year)</span>
            </div>
            <RangePicker value={filterDateRange} onChange={setFilterDateRange}
              style={{ borderRadius: 8, fontSize: 12, minWidth: 240 }} size="small" placeholder={["From date", "To date"]} />
          </div>
          {extraFilterCount > 0 && (
            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, paddingBottom: 2 }}>
              ✓ {extraFilterCount} extra filter{extraFilterCount > 1 ? "s" : ""} active
            </div>
          )}
        </div>
      </Drawer>

      <Toast toasts={toasts} />
    </Layout>
  );
}