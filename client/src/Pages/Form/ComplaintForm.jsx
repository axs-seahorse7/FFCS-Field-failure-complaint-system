import { useState, useEffect, useRef } from "react";
import api from "../../services/axios-interceptore/api";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import axios from "axios";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const CUSTOMERS = [
  "GODREJ","HAIER","AMSTRAD","ONIDA","CMI","MARQ","CROMA","BPL",
  "HYUNDAI","SANSUI","VOLTAS","BLUE STAR","SAMSUNG","LG","WHIRLPOOL",
  "DAIKIN","HITACHI","PANASONIC","CARRIER","OTHER",
];

const DEFECT_CATEGORIES = [
  "ELEC PART DEFECTS",
  "PART BROKEN / DAMAGED / MISSING",
  "LEAK",
  "NOISE",
  "MISC DEFECT",
];

const DEFECTIVE_PARTS = [
  "REMOTE","ODU PCB","IDU PCB","IDU CHASSIS","IDU MOTOR","EVAPORATOR COIL",
  "COMPRESSOR","CFF","ODU MOTOR","DISPLAY PCB","CONDENSER COIL","GAS",
  "WAC FAN","COPPER TUBING","LOUVER HORZ","WAC BASE","SENSOR","EVP SUPPORT",
  "IDU MOTOR COVER","DENT / DAMAGED","SERVICE VALVE","FAN","WIRING CONNECTION",
  "IDU PANEL","WAC PANEL","WAC PCB","WAC BLOWER","TUBING","SOFTWARE",
  "WAC DISPLAY PCB","MISC",
];

const MANUFACTURING_PLANTS = ["PG Supa", "NGM Supa", "PG Bhiwadi", "NGM Bhiwadi"];
const DATABASE_OPTIONS      = ["Evidence", "Verification", "Data"];

const DEFECT_DETAILS_MAP = {
  "ELEC PART DEFECTS": [
    "REMOTE HALF DISPLAY","REMOTE NOT WORKING","REMOTE SENSING ISSUE",
    "PFC Q1 FAILURE","Error E6","PFC - L BURNT","PCB - MOTOR NOT WORK",
    "F3-IPM FAULT","PCB DAMAGED","PCB BURNT","PCB - COMP NOT WORK",
    "ODU PCB NOT WORKING","CONNECTION FAILED","FUSE BURNT","SENSOR NOT WORKING",
    "E2-PROM FAILED","IDU PCB NOT WORKING","Error EE/E0/E2/E3/E4/E5",
    "DISPLAY PCB HALF DIGIT","DISPLAY PCB NOT WORKING","WIFI ERROR",
    "E1-IDU FAN MOTOR","SWING MOTOR NOT WORKING","IDU MOTOR NOT WORKING",
    "MOTOR NOISE","MOTOR DAMAGED","ODU MOTOR NOT WORKING",
    "COMPRESSOR NOT STARTING","COMPRESSOR NOISE","COMPRESSOR TRIPPING",
    "COMPRESSOR PUMPING NG",
  ],
  "PART BROKEN / DAMAGED / MISSING": [
    "IDU PANEL BROKEN / DAMAGED","IDU CHASSIS DAMAGED","CFF BROKEN / DAMAGED",
    "CFF TOUCHING NOISE","EVP SUPPORT BROKEN","IDU MOTOR COVER BROKEN",
    "LOUVER WARPAGE / DAMAGED","REMOTE MISSING","WRONG PART",
    "FLASHES IN DRAIN LINE","PART MISSING","INSTALLATION ISSUE","ODU DAMAGED",
    "NO FUNCTIONAL DEFECT","WATER DROPAGE","I-KIT MISSING",
    "CFF PULL OUT FROM BEARING","AIR FLOW NOISE","FAN OUT / DAMAGED",
    "WAC FAN BROKEN","WAC BASE DAMAGED","IDU BURNT","ODU BURNT",
    "BEARING BUSH MISSING","LOUVER NOISE","WAC PANEL BROKEN",
    "PART BROKEN / OPEN","WAC BLOWER DAMAGED",
  ],
  "LEAK": [
    "EVP HAIRPIN LEAK","LOW / NO GAS","SUCTION BRAZING LEAK","EVP LEAK",
    "COMPRESSOR LEAK","CONDENSER LEAK","EVP HEADER LEAK","EVP DAMAGED",
    "U-BEND LEAK","SERVICE VALVE LEAK","COND SUPPORT TUBE BRAZING",
    "CONDENSER DAMAGED","EVP INTERNAL LEAK","COND INTERNAL LEAK",
    "COND HEADER LEAK","DISCHARGE BRAZING LEAK","CAPILLARY BRAZING LEAK",
    "L-BEND LEAK","CHOKE","COND HAIRPIN LEAK","PINCH OFF LEAK",
    "VALVE THREAD DAMAGED","SUCTION CRACKED","FLAIR NUT LEAK",
    "DISCHARGE TUBE LEAK","LEAK NOT FOUND",
  ],
  "NOISE": [
    "COMPRESSOR NOISE","MOTOR NOISE","CFF TOUCHING NOISE","LOUVER NOISE",
    "AIR FLOW NOISE","ODU STRUCTURAL NOISE","TUBE / COMP VIBRATION",
  ],
  "MISC DEFECT": [
    "MISC DEF","LOW / NO COOLING","WRONG WIRING","PCB PROTECTION / FAULT",
    "HIGH / LOW RPM","ON OFF SWITCH NG","PCB-REMOTE NOT WORKING",
    "COMPRESSOR TERMINAL BLAST","WAC PCB NOT WORKING",
    "WAC DISPLAY PCB HALF DIGIT","WAC DISPLAY PCB NOT WORKING",
    "CAPACITOR BURNT / NG",
  ],
};

const MAX_FILE_SIZE = 1024 * 1024;

const initialForm = {
  complaintDate: new Date().toISOString().split("T")[0],
  complaintNo: "",
  customerName: "",
  commodity: "",
  replacementCategory: "",
  modelName: "",
  serialNo: "",
  partNo: "",
  partModel: "",
  customerComplaintId: "",
  purchaseDate: "",
  doa: "",
  defectCategory: "",
  defectivePart: "",
  symptom: "",
  defectDetails: "",
  status: "Open",
  manufacturingPlant: "",
  manufacturingDate: "",
  city: "",
  state: "",
  dataBase: "",
};

function calcProductAging(complaintDate, purchaseDate) {
  if (!complaintDate || !purchaseDate) return "";
  const diff = new Date(complaintDate) - new Date(purchaseDate);
  if (isNaN(diff) || diff < 0) return "";
  return Math.floor(diff / 86400000) + " days";
}

/* ─────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────── */
const T = {
  // iOS system colors
  blue:    "#007AFF",
  green:   "#34C759",
  red:     "#FF3B30",
  orange:  "#FF9F0A",
  gray6:   "#F2F2F7",
  gray5:   "#E5E5EA",
  gray4:   "#D1D1D6",
  gray3:   "#C7C7CC",
  gray2:   "#AEAEB2",
  gray1:   "#8E8E93",
  label:   "#1C1C1E",
  label2:  "#3A3A3C",
  label3:  "#636366",
  // Surfaces
  surface:        "rgba(255,255,255,0.82)",
  surfaceHover:   "rgba(255,255,255,0.95)",
  border:         "rgba(0,0,0,0.08)",
  borderFocus:    "#007AFF",
  // Shadows
  shadowSm: "0 2px 8px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 24px rgba(0,0,0,0.08)",
  shadowLg: "0 8px 40px rgba(0,0,0,0.10)",
};

/* ─────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────── */
function Label({ children, required }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.label3, letterSpacing: "0.3px" }}>{children}</span>
      {required && <span style={{ fontSize: 10, color: T.red, fontWeight: 800, lineHeight: 1 }}>*</span>}
    </div>
  );
}

function Hint({ children }) {
  return <p style={{ fontSize: 10, color: T.gray2, margin: "3px 0 0", lineHeight: 1.4 }}>{children}</p>;
}

function ErrMsg({ show, msg = "Required" }) {
  if (!show) return null;
  return (
    <p style={{ fontSize: 10, color: T.red, margin: "3px 0 0", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke={T.red} strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
      </svg>
      {msg}
    </p>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && !error && <Hint>{hint}</Hint>}
      {error && <ErrMsg show={true} msg={error} />}
    </div>
  );
}

const baseInputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: `1.5px solid ${T.gray5}`,
  background: T.gray6,
  fontSize: 12,
  fontWeight: 500,
  color: T.label,
  outline: "none",
  transition: "all 0.15s cubic-bezier(0.4,0,0.2,1)",
  WebkitAppearance: "none",
  appearance: "none",
  fontFamily: "inherit",
};

function Input({ value, onChange, placeholder, type = "text", readOnly, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...baseInputStyle,
        background: readOnly ? T.gray5 : focused ? "#fff" : T.gray6,
        borderColor: error ? T.red : focused ? T.blue : T.gray5,
        boxShadow: focused ? `0 0 0 3px rgba(0,122,255,0.12)` : error ? `0 0 0 3px rgba(255,59,48,0.10)` : "none",
        color: readOnly ? T.gray1 : T.label,
        cursor: readOnly ? "not-allowed" : "text",
      }}
    />
  );
}

function Select({ value, onChange, options, placeholder, disabled, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...baseInputStyle,
          paddingRight: 32,
          background: disabled ? T.gray5 : focused ? "#fff" : T.gray6,
          borderColor: error ? T.red : focused ? T.blue : T.gray5,
          boxShadow: focused ? `0 0 0 3px rgba(0,122,255,0.12)` : error ? `0 0 0 3px rgba(255,59,48,0.10)` : "none",
          color: value ? T.label : T.gray2,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <option hidden value="">{placeholder || "Select…"}</option>
        {options.map((o) => <option key={o} value={o} style={{ color: T.label }}>{o}</option>)}
      </select>
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <svg width="12" height="12" fill="none" stroke={T.gray2} strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

/* Section Header */
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 20px",
      borderBottom: `1px solid ${T.border}`,
      background: "rgba(255,255,255,0.5)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `linear-gradient(135deg, rgba(0,122,255,0.15), rgba(0,122,255,0.05))`,
        border: `1px solid rgba(0,122,255,0.15)`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 800, color: T.label, margin: 0, letterSpacing: "-0.2px" }}>{title}</p>
        {subtitle && <p style={{ fontSize: 10, color: T.gray1, margin: "1px 0 0", fontWeight: 500 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* Divider row label */
function DividerLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 2px" }}>
      <div style={{ flex: 1, height: 1, background: T.gray5 }} />
      <span style={{ fontSize: 9.5, fontWeight: 700, color: T.blue, letterSpacing: "0.6px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: T.gray5 }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────── */
function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 3,
          background: i === current ? T.blue : i < current ? T.green : T.gray4,
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function ComplaintForm({ editId, userEmail }) {
  const [form, setForm]                 = useState(initialForm);
  const [loading, setLoading]           = useState(false);
  const [touched, setTouched]           = useState({});
  const [invoiceFile, setInvoiceFile]   = useState(null);
  const [invoiceError, setInvoiceError] = useState("");
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef = useRef(null);
  const navigate     = useNavigate();

  useEffect(() => {
    setForm((f) => ({ ...f, complaintNo: `PG-${Date.now().toString().slice(-6)}` }));
  }, []);

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: val };
      if (field === "defectCategory") next.defectDetails = "";
      return next;
    });
    setTouched((t) => ({ ...t, [field]: true }));
  };

  useEffect(() => {
    if (form.dataBase !== "Evidence") {
      setInvoiceFile(null);
      setInvoiceError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [form.dataBase]);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setInvoiceError(`File too large — max 2 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB selected)`);
      setInvoiceFile(null);
      return;
    }
    setInvoiceError("");
    setInvoiceFile(file);
  };

  

  const removeFile = () => {
    setInvoiceFile(null);
    setInvoiceError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const requiredFields = [
    "complaintDate","customerName","commodity","modelName",
    "defectCategory","defectivePart","defectDetails",
  ];
  const errors = {};
  requiredFields.forEach((f) => {
    if (touched[f] && !(form[f]?.trim?.() || form[f])) errors[f] = "This field is required";
  });

  const isValid = requiredFields.every((f) => form[f]?.trim?.() || form[f]);
  const productAging = calcProductAging(form.complaintDate, form.purchaseDate);
  const availableDefects = form.defectCategory ? (DEFECT_DETAILS_MAP[form.defectCategory] || []) : [];

    const baseUrl = import.meta.env.VITE_API_URI || "http://localhost:3000";

  const handleSubmit = async (e) => {
    e.preventDefault();

    const t = {};
    requiredFields.forEach((f) => (t[f] = true));
    setTouched(t);

    if (!isValid) {
      message.error("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        if (v != null) payload.append(k, v);
      });

      if (invoiceFile) {
        payload.append("image", invoiceFile); 
      }
      
      const { data } = await axios.post(`${baseUrl}/create-complaint`, payload, {
        withCredentials: true,
      });

      message.success(data.message || "Complaint created successfully!");
      handleReset();

    } catch (err) {
      if(err.response.status === 11000) {
        message.error("Reset your complaint number. The current one is already used.");
      }
      message.error(err?.response?.data?.message || "Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ ...initialForm, complaintDate: new Date().toISOString().split("T")[0], complaintNo: `PG-${Date.now().toString().slice(-6)}` });
    setTouched({});
    setInvoiceFile(null);
    setInvoiceError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filledCount = requiredFields.filter((f) => form[f]?.trim?.() || form[f]).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }
        select option { color: #1C1C1E; background: white; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }

        .form-grid-6 {
          display: grid; gap: 14px;
          grid-template-columns: repeat(1, 1fr);
        }
        @media (min-width: 480px)  { .form-grid-6 { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 768px)  { .form-grid-6 { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .form-grid-6 { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1280px) { .form-grid-6 { grid-template-columns: repeat(6, 1fr); } }

        .form-grid-4 {
          display: grid; gap: 14px;
          grid-template-columns: repeat(1, 1fr);
        }
        @media (min-width: 480px)  { .form-grid-4 { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 768px)  { .form-grid-4 { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .form-grid-4 { grid-template-columns: repeat(4, 1fr); } }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fade-up { animation: fadeUp 0.35s cubic-bezier(0.4,0,0.2,1) both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.10s; }
        .fade-up-3 { animation-delay: 0.15s; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.75s linear infinite; }

        .drop-zone-active { border-color: #007AFF !important; background: rgba(0,122,255,0.05) !important; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #C7C7CC; border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg, #F2F2F7 0%, #E8E8EF 100%)" }}>

        {/* ══════════ NAVBAR ══════════ */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(30px) saturate(200%)",
          WebkitBackdropFilter: "blur(30px) saturate(200%)",
          borderBottom: `1px solid ${T.border}`,
          height: 58, display: "flex", alignItems: "center", padding: "0 20px",
          gap: 12,
        }}>
          {/* Logo */}
          <div style={{
            width: 80, height: 80, borderRadius: 10, overflow: "hidden",
            
          }}>
            <img src="/pg-logo-Photoroom.png" alt="PG" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          <div style={{ lineHeight: 1 }} className="border-l-2 border-red-500 pl-5" >
            <div style={{ fontSize: 14, fontWeight: 800, color: T.label, letterSpacing: "-0.3px" }}>
              CMS <span style={{ color: T.red }} className="tracking-wider" >Entry</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: T.gray1, marginTop: 2 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <StepDots current={Math.min(Math.floor((filledCount / requiredFields.length) * 3), 2)} total={3} />
            <span style={{ fontSize: 10, fontWeight: 700, color: T.gray1 }}>
              {filledCount}/{requiredFields.length}
            </span>
          </div>

          {/* User email */}
          {userEmail && (
            <div style={{
              display: "none", // shown via media query
              alignItems: "center", gap: 6,
              padding: "5px 10px 5px 6px", borderRadius: 9,
              background: T.gray6, border: `1px solid ${T.gray5}`,
              marginRight: 6,
            }} className="user-pill">
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: "linear-gradient(135deg, #007AFF, #5AC8FA)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="11" height="11" fill="white" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.label2, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userEmail}
              </span>
            </div>
          )}

          {/* Back */}
          <button onClick={() => navigate("/complaints")} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 10,
            background: T.gray6, border: `1px solid ${T.gray5}`,
            fontSize: 12, fontWeight: 700, color: T.label2,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round"/>
            </svg>
            <span style={{ display: "none" }} className="btn-label-sm">Dashboard</span>
          </button>

          {/* Logout */}
          <button onClick={() => navigate("/logout")} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 10,
            background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)",
            fontSize: 12, fontWeight: 700, color: T.red,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeLinecap="round"/>
            </svg>
            <span style={{ display: "none" }} className="btn-label-sm">Logout</span>
          </button>
        </header>

        {/* ══════════ BODY ══════════ */}
        <main style={{ padding: "20px 16px 80px", maxWidth: 1400, margin: "0 auto" }}>
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ─── SECTION 1: Complaint Info ─── */}
            <div className="fade-up" style={{
              background: T.surface,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderRadius: 20,
              border: `1px solid rgba(255,255,255,0.7)`,
              boxShadow: T.shadowMd,
              overflow: "hidden",
            }}>
              <SectionHeader icon="📋" title="Complaint Information" subtitle="Core complaint & customer details" />

              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Row A */}
                <div className="form-grid-6">
                  <Field label="Complaint No." hint="Auto-generated">
                    <Input value={form.complaintNo} readOnly placeholder="Auto" />
                  </Field>
                  <Field label="Complaint Date" required error={errors.complaintDate}>
                    <Input type="date" value={form.complaintDate} onChange={set("complaintDate")} error={!!errors.complaintDate} />
                  </Field>
                  <Field label="Customer Complaint ID">
                    <Input value={form.customerComplaintId} onChange={set("customerComplaintId")} placeholder="e.g. CMP-2024-0012" />
                  </Field>
                  <Field label="DOA / Warranty">
                    <Select value={form.doa} onChange={set("doa")} options={["DOA","IW","OW"]} placeholder="Select…" />
                  </Field>
                  <Field label="Purchase Date">
                    <Input type="date" value={form.purchaseDate} onChange={set("purchaseDate")} />
                  </Field>
                  <Field label="Product Aging" hint="Auto-calculated">
                    <Input value={productAging} readOnly placeholder="Auto" />
                  </Field>
                </div>

                <DividerLabel>Customer & Product</DividerLabel>

                {/* Row B */}
                <div className="form-grid-6">
                  <Field label="Customer Name" required error={errors.customerName}>
                    <Select value={form.customerName} onChange={set("customerName")} options={CUSTOMERS} placeholder="Select customer…" error={!!errors.customerName} />
                  </Field>
                  <Field label="Commodity" required error={errors.commodity}>
                    <Select value={form.commodity} onChange={set("commodity")} options={["IDU","ODU","WAC"]} placeholder="Select…" error={!!errors.commodity} />
                  </Field>
                  <Field label="Replacement">
                    <Select value={form.replacementCategory} onChange={set("replacementCategory")}
                      options={["Part","Unit","Services","Demonstration"]} placeholder="Select…" />
                  </Field>
                  <Field label="Model Name"  error={errors.modelName}>
                    <Input value={form.modelName} onChange={set("modelName")} placeholder="e.g. Godrej 18K 4S INV" error={!!errors.modelName} />
                  </Field>
                  <Field label="Unit Serial No.">
                    <Input value={form.serialNo} onChange={set("serialNo")} placeholder="e.g. SN20240001" />
                  </Field>
                  <Field label="Part Serial No.">
                    <Input value={form.partNo} onChange={set("partNo")} placeholder="e.g. PN-PCB-001" />
                  </Field>
                </div>

                <DividerLabel>Manufacturing · Location · Evidence</DividerLabel>

                {/* Row C */}
                <div className="form-grid-6">
                  <Field label="Part Model">
                    <Input value={form.partModel} onChange={set("partModel")} placeholder="e.g. PCB-V2-18K" />
                  </Field>
                  <Field label="Mfg. Plant">
                    <Select value={form.manufacturingPlant} onChange={set("manufacturingPlant")} options={MANUFACTURING_PLANTS} placeholder="Select plant…" />
                  </Field>
                  <Field label="Mfg. Date">
                    <Input type="date" value={form.manufacturingDate} onChange={set("manufacturingDate")} />
                  </Field>
                  <Field label="City">
                    <Input value={form.city} onChange={set("city")} placeholder="e.g. Mumbai" />
                  </Field>
                  <Field label="State">
                    <Input value={form.state} onChange={set("state")} placeholder="e.g. Maharashtra" />
                  </Field>
                  <Field label="Data Base" hint="Evidence requires file upload">
                    <Select value={form.dataBase} onChange={set("dataBase")} options={DATABASE_OPTIONS} placeholder="Select…" />
                  </Field>
                </div>

                {/* Evidence Upload Zone */}
                {form.dataBase === "Evidence" && (
                  <div
                    className={dragOver ? "drop-zone-active" : ""}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${invoiceError ? T.red : invoiceFile ? T.green : T.gray4}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                      cursor: "pointer",
                      background: invoiceFile ? "rgba(52,199,89,0.04)" : invoiceError ? "rgba(255,59,48,0.04)" : T.gray6,
                      transition: "all 0.2s",
                      display: "flex", alignItems: "center", gap: 14,
                    }}
                  >
                    <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: "none" }} onChange={(e)=> setInvoiceFile(e.target.files[0]) } />

                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: invoiceFile ? "rgba(52,199,89,0.12)" : invoiceError ? "rgba(255,59,48,0.10)" : "rgba(0,122,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>
                      {invoiceFile ? "✅" : invoiceError ? "⚠️" : "📎"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {invoiceFile ? (
                        <>
                          <p style={{ fontSize: 12, fontWeight: 700, color: T.green, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {invoiceFile.name}
                          </p>
                          <p style={{ fontSize: 10, color: T.gray1, margin: "2px 0 0", fontFamily: "ui-monospace, monospace" }}>
                            {(invoiceFile.size / 1024).toFixed(1)} KB · Click to replace
                          </p>
                        </>
                      ) : invoiceError ? (
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.red, margin: 0 }}>{invoiceError}</p>
                      ) : (
                        <>
                          <p style={{ fontSize: 12, fontWeight: 700, color: T.label2, margin: 0 }}>
                            Drag & drop or click to upload evidence
                          </p>
                          <p style={{ fontSize: 10, color: T.gray1, margin: "2px 0 0" }}>
                            JPG · PNG · PDF · Max 200 KB
                          </p>
                        </>
                      )}
                    </div>

                    {invoiceFile && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 8,
                          background: "rgba(255,59,48,0.08)", border: `1px solid rgba(255,59,48,0.2)`,
                          color: T.red, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                        }}>
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>
                )}

                {/* Non-evidence DB notice */}
                {form.dataBase && form.dataBase !== "Evidence" && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 12,
                    background: "rgba(0,122,255,0.06)", border: `1px solid rgba(0,122,255,0.15)`,
                  }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#007AFF" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
                    </svg>
                    <p style={{ fontSize: 11, color: T.blue, fontWeight: 600, margin: 0 }}>
                      No file required for <strong>{form.dataBase}</strong> database type.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── SECTION 2: Defect Details ─── */}
            <div className="fade-up fade-up-1" style={{
              background: T.surface,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderRadius: 20,
              border: `1px solid rgba(255,255,255,0.7)`,
              boxShadow: T.shadowMd,
              overflow: "hidden",
            }}>
              <SectionHeader icon="🔍" title="Defect & Part Details" subtitle="Categorize the failure accurately" />

              <div style={{ padding: "18px 20px" }}>
                <div className="form-grid-4">
                  <Field label="Defect Category" required error={errors.defectCategory}>
                    <Select value={form.defectCategory} onChange={set("defectCategory")}
                      options={DEFECT_CATEGORIES} placeholder="Select category…" error={!!errors.defectCategory} />
                  </Field>

                  <Field
                    label="Defect Details"
                    required
                    error={errors.defectDetails}
                    hint={!form.defectCategory ? "Select a category first" : `${availableDefects.length} options available`}
                  >
                    <Select
                      value={form.defectDetails}
                      onChange={set("defectDetails")}
                      options={availableDefects}
                      placeholder={form.defectCategory ? "Select defect…" : "Pick category first…"}
                      disabled={!form.defectCategory}
                      error={!!errors.defectDetails}
                    />
                  </Field>

                  <Field label="Defective Part" required error={errors.defectivePart}>
                    <Select value={form.defectivePart} onChange={set("defectivePart")}
                      options={DEFECTIVE_PARTS} placeholder="Select part…" error={!!errors.defectivePart} />
                  </Field>

                  <Field label="Symptoms" hint="Optional — observed behavior">
                    <Input value={form.symptom} onChange={set("symptom")} placeholder="e.g. Not cooling, loud noise…" />
                  </Field>
                </div>
              </div>
            </div>

            {/* ─── SUBMIT BAR ─── */}
            <div className="fade-up fade-up-2" style={{
              background: T.surface,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderRadius: 18,
              border: `1px solid rgba(255,255,255,0.7)`,
              boxShadow: T.shadowSm,
              padding: "14px 20px",
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
              {/* Progress bar */}
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.gray1 }}>Form completion</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: isValid ? T.green : T.blue }}>
                    {Math.round((filledCount / requiredFields.length) * 100)}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: T.gray5, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4,
                    background: isValid
                      ? `linear-gradient(90deg, ${T.green}, #30D158)`
                      : `linear-gradient(90deg, ${T.blue}, #5AC8FA)`,
                    width: `${(filledCount / requiredFields.length) * 100}%`,
                    transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                {/* Required hint */}
                <span style={{ fontSize: 10, color: T.gray1, marginRight: 4 }}>
                  <span style={{ color: T.red, fontWeight: 800 }}>*</span> = required
                </span>

                {/* Reset */}
                <button type="button" onClick={handleReset} disabled={loading} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 11,
                  background: T.gray6, border: `1.5px solid ${T.gray5}`,
                  fontSize: 12, fontWeight: 700, color: T.label2,
                  cursor: "pointer", transition: "all 0.15s",
                  opacity: loading ? 0.5 : 1,
                }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M3 12a9 9 0 019-9 9 9 0 016.36 2.64" strokeLinecap="round"/>
                    <polyline points="21 3 15 3 15 9" strokeLinecap="round"/>
                  </svg>
                  Reset
                </button>

                {/* Submit */}
                <button type="submit" disabled={loading} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 24px", borderRadius: 11,
                  background: loading
                    ? T.gray4
                    : isValid
                    ? "linear-gradient(135deg, #007AFF, #0055CC)"
                    : "linear-gradient(135deg, #007AFF, #0055CC)",
                  border: "none",
                  fontSize: 13, fontWeight: 800, color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(0,122,255,0.38)",
                  transition: "all 0.2s",
                  letterSpacing: "-0.2px",
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? (
                    <>
                      <svg className="spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                        <circle opacity="0.3" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                        <path fill="white" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {editId ? "Update Complaint" : "Submit Complaint"}
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .user-pill { display: flex !important; }
          .btn-label-sm { display: inline !important; }
        }
        @media (max-width: 767px) {
          .btn-label-sm { display: none !important; }
          main { padding-left: 12px !important; padding-right: 12px !important; }
        }
      `}</style>
    </>
  );
}