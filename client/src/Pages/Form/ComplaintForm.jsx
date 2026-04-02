import { useState, useEffect, useRef } from "react";
import api from "../../services/axios-interceptore/api";
import { useNavigate } from "react-router-dom";
import { message } from "antd";

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

/* ── Category → Defect Details mapping ── */
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

const MAX_FILE_SIZE = 200 * 1024;

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
   SUB-COMPONENTS
───────────────────────────────────────── */
function SectionBar({ icon, label }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/70">
      <span className="text-xs leading-none">{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-none">{label}</span>
      <div className="flex-1 h-px bg-slate-200/80 ml-1" />
    </div>
  );
}

function MiniDivider({ label }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400 font-mono whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-0.5 leading-none">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[8px] text-slate-400 leading-tight">{hint}</p>}
    </div>
  );
}

function ErrMsg({ show, msg = "Required" }) {
  if (!show) return null;
  return <p className="text-[8px] text-red-500 leading-none">{msg}</p>;
}

const inputCls =
  "w-full px-2.5 py-[6px] rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-[11px] " +
  "outline-none transition-all duration-150 " +
  "focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10 " +
  "placeholder:text-slate-300";

const selectCls =
  "w-full px-2.5 py-[6px] rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-[11px] " +
  "outline-none transition-all duration-150 cursor-pointer appearance-none " +
  "focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10";

const errCls = "!border-red-400 !bg-red-50/40";

function SelectF({ value, onChange, options, placeholder, disabled }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} disabled={disabled}
        className={`${selectCls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
        <option hidden value="">{placeholder || "-- Select --"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function ComplaintForm({ editId, userEmail }) {
  const [form, setForm]                 = useState(initialForm);
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState({ text: "", type: "" });
  const [touched, setTouched]           = useState({});
  const [invoiceFile, setInvoiceFile]   = useState(null);
  const [invoiceError, setInvoiceError] = useState("");
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
    if (msg.text) setMsg({ text: "", type: "" });
  };

  useEffect(() => {
    if (form.dataBase !== "Evidence") {
      setInvoiceFile(null);
      setInvoiceError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [form.dataBase]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setInvoiceError("");
    if (!file) { setInvoiceFile(null); return; }
    if (file.size > MAX_FILE_SIZE) {
      setInvoiceError(`Too large. Max 200 KB (${(file.size / 1024).toFixed(1)} KB selected)`);
      setInvoiceFile(null);
      e.target.value = "";
      return;
    }
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
  const isValid = requiredFields.every((f) => form[f]?.trim?.() || form[f]);
  const productAging = calcProductAging(form.complaintDate, form.purchaseDate);
  const availableDefects = form.defectCategory ? (DEFECT_DETAILS_MAP[form.defectCategory] || []) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = {};
    requiredFields.forEach((f) => (t[f] = true));
    setTouched(t);
    if (!isValid) { setMsg({ text: "Please fill all required fields.", type: "error" }); return; }
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v != null) payload.append(k, v); });
      if (invoiceFile) payload.append("evidence", invoiceFile);
      const { data } = await api.post("/create-complaint", payload, {
        headers: { "Content-Type": "application/json" },
      });
      message.success(data.message || "Complaint created successfully!");
      setForm({ ...initialForm, complaintDate: new Date().toISOString().split("T")[0], complaintNo: `PG-${Date.now().toString().slice(-6)}` });
      setTouched({});
      setInvoiceFile(null);
    } catch (err) {
      message.error(err?.data?.message || "Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ ...initialForm, complaintDate: new Date().toISOString().split("T")[0], complaintNo: `PG-${Date.now().toString().slice(-6)}` });
    setTouched({});
    setMsg({ text: "", type: "" });
    setInvoiceFile(null);
    setInvoiceError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fe = (f) => touched[f] && !form[f] ? errCls : "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { font-family: 'Sora', sans-serif; box-sizing: border-box; }
        select option { background: white; color: #1e293b; }

        /* Responsive grid system */
        .g6 { display:grid; gap:0.5rem; grid-template-columns:repeat(1,1fr); }
        @media(min-width:480px)  { .g6 { grid-template-columns:repeat(2,1fr); } }
        @media(min-width:768px)  { .g6 { grid-template-columns:repeat(3,1fr); } }
        @media(min-width:1024px) { .g6 { grid-template-columns:repeat(4,1fr); } }
        @media(min-width:1280px) { .g6 { grid-template-columns:repeat(6,1fr); } }

        .g4 { display:grid; gap:0.5rem; grid-template-columns:repeat(1,1fr); }
        @media(min-width:480px)  { .g4 { grid-template-columns:repeat(2,1fr); } }
        @media(min-width:768px)  { .g4 { grid-template-columns:repeat(3,1fr); } }
        @media(min-width:1024px) { .g4 { grid-template-columns:repeat(4,1fr); } }
      `}</style>

      <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-red-50/20">

        {/* ══ NAVBAR ══ */}
        <header className="sticky top-0 z-50 bg-[#c9c9c9] shadow-md border-b border-white/10 w-full" style={{height:"50px"}}>
          <div className="w-full px-3 sm:px-5 h-full flex items-center justify-between gap-2">
            {/* LEFT — Logo + title */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-10 w-12 flex items-center justify-center overflow-hidden">
                <img src="/pg-logo-Photoroom.png" alt="PG Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white font-extrabold text-[13px] tracking-tight leading-none">PG Complaint</span>
                <span className="text-white/50 text-[8.5px] font-mono leading-none hidden sm:block">Field Failure Entry</span>
              </div>
            </div>
            {/* RIGHT — actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              {userEmail && (
                <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15">
                  <svg className="w-2.5 h-2.5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                  <span className="text-[9px] text-white/60 font-mono truncate max-w-[140px]">{userEmail}</span>
                </div>
              )}
              {/* Refresh */}
              <button type="button" onClick={() => window.location.reload()} title="Refresh"
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/25 transition-all cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" strokeLinecap="round"/>
                  <polyline points="3 3 3 9 9 9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* Your Complaints */}
              <button onClick={() => navigate("/complaints")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white hover:text-slate-900 hover:bg-white cursor-pointer text-[10px] font-semibold transition-all">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden sm:inline">Your Complaints</span>
                <span className="sm:hidden">Back</span>
              </button>
              {/* Logout */}
              <button type="button" onClick={() => navigate("/logout")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 border border-red-500/30 text-white cursor-pointer text-[10px] font-semibold transition-all">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Toast notification */}
        {msg.text && (
          <div className={`fixed top-14 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-[10.5px] font-semibold border shadow-lg
            ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
            <span>{msg.type === "success" ? "✅" : "⚠️"}</span>{msg.text}
          </div>
        )}

        {/* ══ BODY ══ */}
        <main className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-3 pb-12">
          <form onSubmit={handleSubmit} noValidate className="space-y-2.5">

            {/* ════ SECTION 1 — Complaint Information (+ Manufacturing + Database) ════ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <SectionBar icon="📌" label="Complaint Information" />
              <div className="p-3 sm:p-4 space-y-3">

                {/* ── Row A: Complaint details ── */}
                <div className="g6">
                  <Field label="Complaint No." hint="Auto-generated">
                    <input className={`${inputCls} bg-slate-100 text-slate-400 cursor-not-allowed`} value={form.complaintNo} readOnly />
                  </Field>
                  <Field label="Complaint Date" required>
                    <input type="date" className={`${inputCls} ${fe("complaintDate")}`}
                      value={form.complaintDate} onChange={set("complaintDate")}
                      min={new Date().toISOString().split("T")[0]} />
                    <ErrMsg show={touched.complaintDate && !form.complaintDate} />
                  </Field>
                  <Field label="Customer Complaint ID">
                    <input type="text" className={inputCls} placeholder="e.g. CMP-2024-00123"
                      value={form.customerComplaintId} onChange={set("customerComplaintId")} />
                  </Field>
                  <Field label="DOA / Warranty">
                    <SelectF value={form.doa} onChange={set("doa")} options={["DOA","IW","OW"]} placeholder="-- Select --" />
                  </Field>
                  <Field label="Purchase Date">
                    <input type="date" className={inputCls} value={form.purchaseDate} onChange={set("purchaseDate")} />
                  </Field>
                  <Field label="Product Aging" hint="Auto-calculated">
                    <input className={`${inputCls} bg-slate-100 text-slate-400 cursor-not-allowed`}
                      value={productAging} readOnly placeholder="Auto" />
                  </Field>
                </div>

                <MiniDivider label="Customer & Product" />

                {/* ── Row B: Customer & product ── */}
                <div className="g6">
                  <Field label="Customer Name" required>
                    <SelectF value={form.customerName} onChange={set("customerName")} options={CUSTOMERS} placeholder="-- Select --" />
                    <ErrMsg show={touched.customerName && !form.customerName} />
                  </Field>
                  <Field label="Commodity" required>
                    <SelectF value={form.commodity} onChange={set("commodity")} options={["IDU","ODU","WAC"]} placeholder="-- Select --" />
                    <ErrMsg show={touched.commodity && !form.commodity} />
                  </Field>
                  <Field label="Replacement">
                    <SelectF value={form.replacementCategory} onChange={set("replacementCategory")}
                      options={["Part","Unit","Services","Demonstration"]} placeholder="-- Select --" />
                  </Field>
                  <Field label="Model Name" required>
                    <input type="text" className={`${inputCls} ${fe("modelName")}`}
                      placeholder="e.g. Godrej 18K 4S INV" value={form.modelName} onChange={set("modelName")} />
                    <ErrMsg show={touched.modelName && !form.modelName} />
                  </Field>
                  <Field label="Unit Serial No.">
                    <input type="text" className={inputCls} placeholder="e.g. SN20240001" value={form.serialNo} onChange={set("serialNo")} />
                  </Field>
                  <Field label="Part Serial No.">
                    <input type="text" className={inputCls} placeholder="e.g. PN-PCB-001" value={form.partNo} onChange={set("partNo")} />
                  </Field>
                </div>

                <MiniDivider label="Manufacturing · Location · Database" />

                {/* ── Row C: Part Model · Mfg Plant · Mfg Date · City · State · Database ── */}
                <div className="g6">
                  <Field label="Part Model">
                    <input type="text" className={inputCls} placeholder="e.g. PCB-V2-18K" value={form.partModel} onChange={set("partModel")} />
                  </Field>
                  <Field label="Mfg. Plant">
                    <SelectF value={form.manufacturingPlant} onChange={set("manufacturingPlant")}
                      options={MANUFACTURING_PLANTS} placeholder="-- Select --" />
                  </Field>
                  <Field label="Mfg. Date">
                    <input type="date" className={inputCls} value={form.manufacturingDate} onChange={set("manufacturingDate")} />
                  </Field>
                  <Field label="City">
                    <input type="text" className={inputCls} placeholder="e.g. Mumbai" value={form.city} onChange={set("city")} />
                  </Field>
                  <Field label="State">
                    <input type="text" className={inputCls} placeholder="e.g. Maharashtra" value={form.state} onChange={set("state")} />
                  </Field>
                  <Field label="Data Base" required hint="Evidence = attach file">
                    <SelectF value={form.dataBase} onChange={set("dataBase")} options={DATABASE_OPTIONS} placeholder="-- Select --" />
                  </Field>
                </div>

                {/* ── Evidence uploader (inline, compact) ── */}
                {form.dataBase === "Evidence" && (
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150
                      ${invoiceError
                        ? "border-red-400 bg-red-50/30"
                        : invoiceFile
                          ? "border-green-400 bg-green-50/30"
                          : "border-slate-200 bg-slate-50 hover:border-red-300 hover:bg-red-50/10"
                      }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileChange} />
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0
                      ${invoiceFile ? "bg-green-100" : invoiceError ? "bg-red-100" : "bg-slate-100"}`}>
                      {invoiceFile ? "✅" : invoiceError ? "⚠️" : "📎"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {invoiceFile ? (
                        <p className="text-[10px] font-semibold text-green-700 truncate">
                          {invoiceFile.name}
                          <span className="text-[8.5px] text-green-500 font-mono ml-1">({(invoiceFile.size/1024).toFixed(1)} KB)</span>
                        </p>
                      ) : invoiceError ? (
                        <p className="text-[9.5px] text-red-500 font-semibold">{invoiceError}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-semibold text-slate-600">Click to upload evidence</p>
                          <span className="text-[8.5px] text-slate-400 font-mono">JPG · PNG · PDF · Max 200 KB</span>
                        </div>
                      )}
                    </div>
                    {invoiceFile && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                        className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-500 text-[8.5px] font-semibold hover:bg-red-100 transition-all">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>
                )}

                {form.dataBase && form.dataBase !== "Evidence" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-100">
                    <span className="text-sm">ℹ️</span>
                    <p className="text-[9px] text-blue-600 font-semibold">
                      No file required for <span className="font-bold">{form.dataBase}</span>.
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* ════ SECTION 2 — Defect & Part Details ════ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <SectionBar icon="🔍" label="Defect & Part Details" />
              <div className="p-3 sm:p-4">
                <div className="g4">
                  <Field label="Defect Category" required>
                    <SelectF value={form.defectCategory} onChange={set("defectCategory")}
                      options={DEFECT_CATEGORIES} placeholder="-- Select Category --" />
                    <ErrMsg show={touched.defectCategory && !form.defectCategory} />
                  </Field>
                  <Field label="Defect Details" required hint={!form.defectCategory ? "Select category first" : `${availableDefects.length} options`}>
                    <SelectF
                      value={form.defectDetails}
                      onChange={set("defectDetails")}
                      options={availableDefects}
                      placeholder={form.defectCategory ? "-- Select Defect --" : "-- Pick category first --"}
                      disabled={!form.defectCategory}
                    />
                    <ErrMsg show={touched.defectDetails && !form.defectDetails} />
                  </Field>
                  <Field label="Defective Part" required>
                    <SelectF value={form.defectivePart} onChange={set("defectivePart")}
                      options={DEFECTIVE_PARTS} placeholder="-- Select Part --" />
                    <ErrMsg show={touched.defectivePart && !form.defectivePart} />
                  </Field>
                  <Field label="Symptoms" hint="Observed symptoms (optional)">
                    <input type="text" className={inputCls}
                      placeholder="e.g. Not cooling, loud noise on startup"
                      value={form.symptom} onChange={set("symptom")} />
                  </Field>
                </div>
              </div>
            </div>

            {/* ════ SUBMIT BAR ════ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-3 sm:px-4 py-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button type="submit" disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-[#12172B] hover:bg-[#1a2140] active:scale-[.98] text-white font-bold text-[11px] tracking-wide cursor-pointer shadow-md shadow-slate-900/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Saving…
                    </>
                  ) : editId ? "Update Complaint" : "Submit Complaint"}
                </button>
                <button type="button" onClick={handleReset} disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-[.98] text-slate-600 font-semibold text-[11px] border border-slate-200 transition-all duration-150 disabled:opacity-50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" strokeLinecap="round"/>
                    <polyline points="3 3 3 9 9 9" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Reset
                </button>
                <p className="sm:ml-auto text-[8.5px] text-slate-400 text-center sm:text-right font-mono">
                  <span className="text-red-500 font-bold">*</span> required fields
                </p>
              </div>
            </div>

          </form>
        </main>
      </div>
    </>
  );
}