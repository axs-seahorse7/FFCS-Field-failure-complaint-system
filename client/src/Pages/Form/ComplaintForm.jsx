import { useState, useEffect } from "react";
import api from "../../services/axios-interceptore/api";
import { useNavigate } from "react-router-dom";

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
];
const DEFECTIVE_PARTS = [
  "ODU PCB","IDU PCB","DISPLAY PCB","REMOTE","IDU MOTOR","ODU MOTOR",
  "SWING MOTOR","COMPRESSOR","EVAPORATOR COIL","CONDENSER COIL",
  "EXPANSION VALVE","CAPILLARY","IDU CHASSIS","ODU CHASSIS","FAN BLADE",
  "DRAIN TRAY","INSTALLATION PLATE","H-LOUVER","V-LOUVER","GAS PIPE",
  "WIRE HARNESS","OTHER",
];
const STATUSES = ["Open","Active","Pending","Resolved","Closed"];

const initialForm = {
  complaintDate: new Date().toISOString().split("T")[0],
  complaintNo: "",
  customerName: "",
  commodity: "",
  replacementCategory: "",
  modelName: "",
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
  "placeholder:text-slate-300 font-['Sora',sans-serif]";

const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm " +
  "outline-none transition-all duration-150 cursor-pointer appearance-none " +
  "focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10 " +
  "font-['Sora',sans-serif]";

function Select({ id, value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={onChange} className={selectCls}>
        <option value="">{placeholder || "-- Select --"}</option>
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

function StatusBadge({ status }) {
  const map = {
    Open:     "bg-blue-50 text-blue-600 border-blue-200",
    Active:   "bg-green-50 text-green-600 border-green-200",
    Pending:  "bg-amber-50 text-amber-600 border-amber-200",
    Resolved: "bg-teal-50 text-teal-600 border-teal-200",
    Closed:   "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${map[status] || map.Open}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}



/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function ComplaintForm({  editId, userEmail, }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  // Auto-generate complaint number
  useEffect(() => {
    const ts = Date.now().toString().slice(-6);
    setForm((f) => ({ ...f, complaintNo: `PG-${ts}` }));
  }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setTouched((t) => ({ ...t, [field]: true }));
    if (msg.text) setMsg({ text: "", type: "" });
  };

  const requiredFields = ["complaintDate","customerName","commodity","modelName","defectCategory","defectivePart","defectDetails"];
  const isValid = requiredFields.every((f) => form[f]?.trim?.() || form[f]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mark all required as touched for validation UI
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
      const res = await api({method: editId ? "put" : "post", url: editId ? `/complaints/${editId}` : "/save-complaint",
        data: form,
      });
      if (res.data?.success) {
        setMsg({ text: "✅ Complaint saved successfully!", type: "success" });
        if (!editId) setTimeout(handleReset, 2000);
      } else {
        setMsg({ text: `❌ ${res.data?.message || "Submission failed."}`, type: "error" });
      }
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ ...initialForm, complaintDate: new Date().toISOString().split("T")[0], complaintNo: `PG-${Date.now().toString().slice(-6)}` });
    setTouched({});
    setMsg({ text: "", type: "" });
  };

 

  const fieldErr = (f) => touched[f] && !form[f] ? "border-red-400 focus:border-red-500 focus:ring-red-400/10 bg-red-50/40" : "";

  return (
    <>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        select option { background: white; color: #1e293b; }
      `}</style>

      <div className="min-h-screen bg-linear-to-br from-slate-100 via-slate-50 to-red-50/30">

        {/* ── TOP NAV ── */}
        <header className="sticky top-0 z-50 bg-[#c9c9c9] shadow-lg shadow-black/20 border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Logo placeholder */}
              <div className="w-20 h-20 rounded-md flex items-center justify-center shrink-0">
                <img src="pg-logo-Photoroom.png" alt="PG Logo" />
              </div>
              
              <span className="sm:hidden text-sm font-bold text-white">PG Complaint</span>
            </div>

            <div className="flex items-center gap-3">
              {userEmail && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-slate-400 font-['DM_Mono',monospace]">{userEmail}</span>
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

        {/* ── BODY ── */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 pb-20">

          {/* Page title */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Field Failure  Entry Form
              </h1>
              {editId && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                  Editing
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-['DM_Mono',monospace]">
              Fill all required fields marked <span className="text-red-500 font-bold">*</span> and submit to save the record.
            </p>
          </div>

          {/* Feedback message */}
          {msg.text && (
            <div className={`mb-5 flex fixed top-20 z-50 right-0  items-start gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold border transition-all
              ${msg.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-600 border-red-200"}`}
            >
              <span className="text-base mt-px">{msg.type === "success" ? "✅" : "⚠️"}</span>
              {msg.text}
              
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ════ SECTION 1: Basic Info ════ */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200 border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 pt-5 pb-1 border-b border-slate-50">
                <SectionHeader icon="📌" subtitle="Section 01" title="Basic Complaint Information" />
              </div>
              <div className="p-5 space-y-5">

                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Complaint No." hint="Auto-generated on submit">
                    <input
                      className={`${inputCls} bg-slate-100 text-slate-500 cursor-not-allowed`}
                      value={form.complaintNo}
                      readOnly
                    />
                  </Field>
                  <Field label="Complaint Date" required>
                    <input
                      type="date"
                      className={`${inputCls} ${fieldErr("complaintDate")}`}
                      value={form.complaintDate}
                      onChange={set("complaintDate")}
                    />
                  </Field>
                  <Field label="DOA / Warranty">
                    <Select
                      value={form.doa}
                      onChange={set("doa")}
                      options={["DOA","IW","OOW"]}
                      placeholder="-- Select --"
                    />
                  </Field>
                </div>

                {/* Divider label */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 font-['DM_Mono',monospace]">
                    Customer & Product Details
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Customer Name" required>
                    <Select
                      value={form.customerName}
                      onChange={set("customerName")}
                      options={CUSTOMERS}
                      placeholder="-- Select Customer --"
                    />
                    {touched.customerName && !form.customerName && (
                      <p className="text-[10px] text-red-500 mt-0.5">Required</p>
                    )}
                  </Field>
                  <Field label="Commodity" required>
                    <Select
                      value={form.commodity}
                      onChange={set("commodity")}
                      options={["IDU","ODU"]}
                      placeholder="-- Select --"
                    />
                    {touched.commodity && !form.commodity && (
                      <p className="text-[10px] text-red-500 mt-0.5">Required</p>
                    )}
                  </Field>
                  <Field label="Replacement Category">
                    <Select
                      value={form.replacementCategory}
                      onChange={set("replacementCategory")}
                      options={["PART"]}
                      placeholder="-- Select --"
                    />
                  </Field>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Model Name" required>
                    <input
                      type="text"
                      className={`${inputCls} ${fieldErr("modelName")}`}
                      placeholder="e.g. Godrej 18K 4S INV"
                      value={form.modelName}
                      onChange={set("modelName")}
                    />
                    {touched.modelName && !form.modelName && (
                      <p className="text-[10px] text-red-500 mt-0.5">Required</p>
                    )}
                  </Field>
                  <Field label="Purchase Date">
                    <input
                      type="date"
                      className={inputCls}
                      value={form.purchaseDate}
                      onChange={set("purchaseDate")}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* ════ SECTION 2: Defect Details ════ */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200 border border-slate-200 overflow-hidden mb-5">
              <div className="px-5 pt-5 pb-1 border-b border-slate-50">
                <SectionHeader icon="🔍" subtitle="Section 02" title="Defect & Part Details" />
              </div>
              <div className="p-5 space-y-5">

                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Defect Category" required>
                    <Select
                      value={form.defectCategory}
                      onChange={set("defectCategory")}
                      options={DEFECT_CATEGORIES}
                      placeholder="-- Select Category --"
                    />
                    {touched.defectCategory && !form.defectCategory && (
                      <p className="text-[10px] text-red-500 mt-0.5">Required</p>
                    )}
                  </Field>
                  <Field label="Defective Part" required>
                    <Select
                      value={form.defectivePart}
                      onChange={set("defectivePart")}
                      options={DEFECTIVE_PARTS}
                      placeholder="-- Select Part --"
                    />
                    {touched.defectivePart && !form.defectivePart && (
                      <p className="text-[10px] text-red-500 mt-0.5">Required</p>
                    )}
                  </Field>
                  <Field label="Complaint Status">
                    <Select
                      value={form.status}
                      onChange={set("status")}
                      options={STATUSES}
                    />
                  </Field>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Symptom" hint="Observed symptom e.g. Unit not cooling">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Unit not cooling, noisy operation"
                      value={form.symptom}
                      onChange={set("symptom")}
                    />
                  </Field>
                  <Field label="Defect Details" required hint="Precise failure description">
                    <input
                      type="text"
                      className={`${inputCls} ${fieldErr("defectDetails")}`}
                      placeholder="e.g. PFC Q1 FAILURE, PCB BURNT"
                      value={form.defectDetails}
                      onChange={set("defectDetails")}
                    />
                    {touched.defectDetails && !form.defectDetails && (
                      <p className="text-[10px] text-red-500 mt-0.5">Required</p>
                    )}
                  </Field>
                </div>

              </div>
            </div>

            {/* ════ SUBMIT AREA ════ */}
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 px-5 py-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl
                    bg-[#12172B] hover:bg-[#1a2140] active:scale-[.98]
                    text-white font-bold text-sm tracking-wide
                    shadow-lg shadow-slate-900/20 transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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
                    <>
                      
                      {editId ? "Update Complaint" : "Submit Complaint"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                    bg-slate-100 hover:bg-slate-200 active:scale-[.98]
                    text-slate-600 font-semibold text-sm
                    border border-slate-200 transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" strokeLinecap="round"/>
                    <polyline points="3 3 3 9 9 9" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Reset Form
                </button>

                {/* Required note */}
                <p className="sm:ml-auto text-[10.5px] text-slate-400 text-center sm:text-right font-['DM_Mono',monospace]">
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




// <ComplaintForm
//   token="jwt_token_here"
//   editId={null}           // pass complaint _id to switch to edit mode
//   userEmail="user@pg.com"
//   onBack={() => navigate("/dashboard")}
// />