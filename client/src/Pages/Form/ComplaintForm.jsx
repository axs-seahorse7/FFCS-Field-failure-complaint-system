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
  "LEAK","NOISE","MISC DEFECT",
  "OTHER",
];
const DEFECTIVE_PARTS = [
  "ODU PCB","IDU PCB","DISPLAY PCB","REMOTE","IDU MOTOR","ODU MOTOR",
  "SWING MOTOR","COMPRESSOR","EVAPORATOR COIL","CONDENSER COIL",
  "EXPANSION VALVE","CAPILLARY","IDU CHASSIS","ODU CHASSIS","FAN BLADE",
  "DRAIN TRAY","INSTALLATION PLATE","H-LOUVER","V-LOUVER","GAS PIPE",
  "WIRE HARNESS","OTHER",
];
const STATUSES = ["Open"];

const DEFECT_LIST = [
  "PFC Q1 FAILURE","IDU PCB NOT WORKING","ODU PCB NOT WORKING","Error E6",
  "E1-IDU FAN MOTOR","F3-IPM FAULT","Error EE/E0/E2/E3/E4/E5","PCB BURNT",
  "CONNECTION FAILED","ON OFF SWITCH NG","PCB - COMP NOT WORK",
  "PCB - MOTOR NOT WORK","DISPLAY PCB HALF DIGIT","DISPLAY PCB NOT WORKING",
  "REMOTE SENSING ISSUE","REMOTE HALF DISPLAY","REMOTE NOT WORKING",
  "ODU MOTOR NOT WORKING","IDU MOTOR NOT WORKING","COMPRESSOR NOISE",
  "COMPRESSOR NOT STARTING","COMPRESSOR PUMPING NG","SWING MOTOR NOT WORKING",
  "COMPRESSOR TERMINAL BLAST","SENSOR NOT WORKING","WRONG WIRING",
  "E2-PROM FAILED","WAC PCB NOT WORKING","WAC DISPLAY PCB HALF DIGIT",
  "WAC DISPLAY PCB NOT WORKING","PFC - L BURNT","MISC DEF","EVP INTERNAL LEAK",
  "COND INTERNAL LEAK","EVP HAIRPIN LEAK","COND HAIRPIN LEAK","EVP LEAK",
  "CONDENSER LEAK","U-BEND LEAK","COND HEADER LEAK","EVP HEADER LEAK",
  "COND SUPPORT TUBE BRAZING","SUCTION BRAZING LEAK","DISCHARGE BRAZING LEAK",
  "SUCTION CRACKED","DISCHARGE TUBE LEAK","CAPILLARY BRAZING LEAK",
  "PINCH OFF LEAK","FLAIR NUT LEAK","LOW / NO GAS","EVP DAMAGED",
  "CONDENSER DAMAGED","LEAK NOT FOUND","IDU PANEL BROKEN / DAMAGED",
  "IDU CHASSIS DAMAGED","CFF BROKEN / DAMAGED","LOUVER WARPAGE / DAMAGED",
  "REMOTE MISSING","ODU DAMAGED","I-KIT MISSING","CFF TOUCHING NOISE",
  "COMPRESSOR TRIPPING","COMPRESSOR LEAK","PCB PROTECTION / FAULT",
  "EVP SUPPORT BROKEN","IDU MOTOR COVER BROKEN","VALVE THREAD DAMAGED",
  "SERVICE VALVE LEAK","WRONG PART","INSTALLATION ISSUE","CHOKE",
  "LOW / NO COOLING","FLASHES IN DRAIN LINE","PART MISSING",
  "NO FUNCTIONAL DEFECT","WATER DROPAGE","MOTOR NOISE","TUBE / COMP VIBRATION",
  "FAN OUT / DAMAGED","AIR FLOW NOISE","CFF PULL OUT FROM BEARING","FUSE BURNT",
  "PCB-REMOTE NOT WORKING","LOUVER NOISE","WAC FAN BROKEN","WAC BASE DAMAGED",
  "WAC PANEL BROKEN","WAC BLOWER DAMAGED","PCB DAMAGED","WIFI ERROR",
  "HIGH / LOW RPM","MOTOR DAMAGED","ODU STRUCTURAL NOISE","IDU BURNT","ODU BURNT",
  "BEARING BUSH MISSING","CAPACITOR BURNT / NG","PART BROKEN / OPEN","OTHER",
];

const MAX_FILE_SIZE = 200 * 1024; // 200 KB

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
};

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center text-base shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-red-500 leading-none mb-0.5">
          {subtitle}
        </p>
        <h3 className="text-sm font-bold text-slate-800 leading-none">{title}</h3>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm " +
  "outline-none transition-all duration-150 " +
  "focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10 " +
  "placeholder:text-slate-300 font-[\'Sora\',sans-serif]";

const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm " +
  "outline-none transition-all duration-150 cursor-pointer appearance-none " +
  "focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10 " +
  "font-[\'Sora\',sans-serif]";

function SelectF({ id, value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={onChange} className={selectCls}>
        <option hidden value="">{placeholder || "-- Select --"}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [touched, setTouched] = useState({});
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceError, setInvoiceError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ts = Date.now().toString().slice(-6);
    setForm((f) => ({ ...f, complaintNo: `PG-${ts}` }));
  }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setTouched((t) => ({ ...t, [field]: true }));
    if (msg.text) setMsg({ text: "", type: "" });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setInvoiceError("");
    if (!file) { setInvoiceFile(null); return; }
    if (file.size > MAX_FILE_SIZE) {
      setInvoiceError(
        `File too large. Max allowed is 200 KB. (Selected: ${(file.size / 1024).toFixed(1)} KB)`
      );
      setInvoiceFile(null);
      e.target.value = "";
      return;
    }
    setInvoiceFile(file);
  };

  const removeInvoice = () => {
    setInvoiceFile(null);
    setInvoiceError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const requiredFields = [
    "complaintDate", "customerName", "commodity", "modelName",
    "defectCategory", "defectivePart", "defectDetails",
  ];
  const isValid = requiredFields.every((f) => form[f]?.trim?.() || form[f]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = {};
    requiredFields.forEach((f) => (t[f] = true));
    setTouched(t);
    if (!isValid) {
      setMsg({ text: "Please fill in all required fields.", type: "error" });
      return;
    }
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const payload = new FormData();
      console.log("Form data:", form);
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) payload.append(k, v);
        });
        // if (invoiceFile) payload.append("invoice", invoiceFile);
        const {data} = await api.post("/create-complaint", payload, {
          headers: { "Content-Type": "application/json" },
        });
          message.success(data.message || "Complaint created successfully!");
          setForm(initialForm);
    } catch (err) {
      message.error(err.data?.message || "Failed to create complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      ...initialForm,
      complaintDate: new Date().toISOString().split("T")[0],
      complaintNo: `PG-${Date.now().toString().slice(-6)}`,
    });
    setTouched({});
    setMsg({ text: "", type: "" });
    setInvoiceFile(null);
    setInvoiceError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fieldErr = (f) =>
    touched[f] && !form[f]
      ? "border-red-400 focus:border-red-500 focus:ring-red-400/10 bg-red-50/40"
      : "";

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        select option { background: white; color: #1e293b; }
      `}</style>

      <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-red-50/30">

        {/* NAV */}
        <header className="sticky top-0 z-50 bg-[#c9c9c9] shadow-lg shadow-black/20 border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-md flex items-center justify-center shrink-0">
                <img src="/pg-logo-Photoroom.png" alt="PG Logo" />
              </div>
              <span className="max-sm:hidden text-sm font-bold text-white">PG Complaint</span>
            </div>
            <div className="flex items-center gap-3">
              {userEmail && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{userEmail}</span>
                </div>
              )}
              <button
                onClick={navigate.bind(null, "/complaints")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12 text-white/70 hover:text-white hover:bg-white/12 cursor-pointer text-xs font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Your Complaints
              </button>
            </div>
          </div>
        </header>

        {/* BODY */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 pb-20">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Field Failure Entry Form
              </h1>
              {editId && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                  Editing
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Fill all required fields marked <span className="text-red-500 font-bold">*</span> and submit to save the record.
            </p>
          </div>

          {msg.text && (
            <div className={`mb-5 flex fixed top-20 z-50 right-0 items-start gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold border transition-all
              ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
              <span className="text-base mt-px">{msg.type === "success" ? "✅" : "⚠️"}</span>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ════ SECTION 1 ════ */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200 border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 pt-5 pb-1 border-b border-slate-50">
                <SectionHeader icon="📌" subtitle="Section 01" title="Complaint Information" />
              </div>
              <div className="p-5 space-y-5">

                {/* Row 1 — Complaint No, Date, Customer Complaint ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Complaint No." hint="Auto-generated on submit">
                    <input className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`} value={form.complaintNo} readOnly />
                  </Field>
                  <Field label="Complaint Date" required>
                    <input type="date" className={`${inputCls} ${fieldErr("complaintDate")}`} value={form.complaintDate} onChange={set("complaintDate")} min={new Date().toISOString().split("T")[0]} />
                  </Field>
                  <Field label="Customer Complaint ID">
                    <input type="text" className={inputCls} placeholder="e.g. CMP-2024-00123" value={form.customerComplaintId} onChange={set("customerComplaintId")} />
                  </Field>
                </div>

                {/* Row 2 — DOA, Purchase Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="DOA / Warranty">
                    <SelectF value={form.doa} onChange={set("doa")} options={["DOA", "IW", "OW"]} placeholder="-- Select --" />
                  </Field>
                  <Field label="Purchase Date">
                    <input type="date" className={inputCls} value={form.purchaseDate} onChange={set("purchaseDate")} />
                  </Field>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 font-mono">Customer & Product Details</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Row 3 — Customer, Commodity, Replacement Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Customer Name" required>
                    <SelectF value={form.customerName} onChange={set("customerName")} options={CUSTOMERS} placeholder="-- Select Customer --" />
                    {touched.customerName && !form.customerName && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </Field>
                  <Field label="Commodity" required>
                    <SelectF value={form.commodity} onChange={set("commodity")} options={["IDU", "ODU", "WAC"]} placeholder="-- Select --" />
                    {touched.commodity && !form.commodity && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </Field>
                  <Field label="Replacement Category">
                    <SelectF value={form.replacementCategory} onChange={set("replacementCategory")} options={["Part", "Unit", "Services", "Demonstration"]} placeholder="-- Select --" />
                  </Field>
                </div>

                {/* Row 4 — Model Name, Serial No, Part No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Model Name" required>
                    <input type="text" className={`${inputCls} ${fieldErr("modelName")}`} placeholder="e.g. Godrej 18K 4S INV" value={form.modelName} onChange={set("modelName")} />
                    {touched.modelName && !form.modelName && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </Field>
                  <Field label="Serial No.">
                    <input type="text" className={inputCls} placeholder="e.g. SN20240001" value={form.serialNo} onChange={set("serialNo")} />
                  </Field>
                  <Field label="Part No.">
                    <input type="text" className={inputCls} placeholder="e.g. PN-PCB-001" value={form.partNo} onChange={set("partNo")} />
                  </Field>
                </div>

                {/* Row 5 — Part Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Part Model">
                    <input type="text" className={inputCls} placeholder="e.g. PCB-V2-18K" value={form.partModel} onChange={set("partModel")} />
                  </Field>
                </div>

              </div>
            </div>

            {/* ════ SECTION 2 ════ */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200 border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 pt-5 pb-1 border-b border-slate-50">
                <SectionHeader icon="🔍" subtitle="Section 02" title="Defect & Part Details" />
              </div>
              <div className="p-5 space-y-5">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Defect Category" required>
                    <SelectF value={form.defectCategory} onChange={set("defectCategory")} options={DEFECT_CATEGORIES} placeholder="-- Select Category --" />
                    {touched.defectCategory && !form.defectCategory && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </Field>
                  <Field label="Defective Part" required>
                    <SelectF value={form.defectivePart} onChange={set("defectivePart")} options={DEFECTIVE_PARTS} placeholder="-- Select Part --" />
                    {touched.defectivePart && !form.defectivePart && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </Field>
                  <Field label="Complaint Status">
                    <SelectF value={form.status} onChange={set("status")} options={STATUSES} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Defect Details" required hint="Precise failure description">
                    <SelectF value={form.defectDetails} onChange={set("defectDetails")} options={DEFECT_LIST} placeholder="-- Select Defect --" />
                    {touched.defectDetails && !form.defectDetails && <p className="text-[10px] text-red-500 mt-0.5">Required</p>}
                  </Field>
                </div>

              </div>
            </div>

            {/* ════ SECTION 3: Invoice ════ */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200 border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 pt-5 pb-1 border-b border-slate-50">
                <SectionHeader icon="🧾" subtitle="Section 03" title="Invoice Upload" />
              </div>
              <div className="p-5">
                <Field label="Upload Invoice" hint="Accepted: JPG, PNG, PDF · Max size: 200 KB">
                  <div
                    className={`relative flex flex-col items-center justify-center gap-2 px-4 py-7 rounded-xl border-2 border-dashed transition-all duration-150 cursor-pointer
                      ${invoiceError ? "border-red-400 bg-red-50/40" : invoiceFile ? "border-green-400 bg-green-50/40" : "border-slate-200 bg-slate-50 hover:border-red-400 hover:bg-red-50/20"}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileChange} />
                    {invoiceFile ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-lg">✅</div>
                        <p className="text-sm font-semibold text-green-700">{invoiceFile.name}</p>
                        <p className="text-[10px] text-green-500 font-mono">{(invoiceFile.size / 1024).toFixed(1)} KB</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeInvoice(); }}
                          className="mt-1 flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-100 transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl">📎</div>
                        <p className="text-sm font-semibold text-slate-600">Click to upload invoice</p>
                        <p className="text-[10px] text-slate-400 font-mono">JPG · PNG · PDF &nbsp;|&nbsp; Max 200 KB</p>
                      </>
                    )}
                  </div>
                  {invoiceError && (
                    <p className="text-[10.5px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      {invoiceError}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            {/* ════ SUBMIT ════ */}
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 px-5 py-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#12172B] hover:bg-[#1a2140] active:scale-[.98] text-white font-bold text-sm tracking-wide cursor-pointer shadow-lg shadow-slate-900/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Saving…
                    </>
                  ) : (
                    editId ? "Update Complaint" : "Submit Complaint"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[.98] text-slate-600 font-semibold text-sm border border-slate-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" strokeLinecap="round"/>
                    <polyline points="3 3 3 9 9 9" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                    Reset Form
                </button>
                <p className="sm:ml-auto text-[10.5px] text-slate-400 text-center sm:text-right font-mono">
                  Fields marked <span className="text-red-500 font-bold">*</span> are required
                </p>
              </div>
            </div>

          </form>
        </main>
      </div>
    </>
  );
}