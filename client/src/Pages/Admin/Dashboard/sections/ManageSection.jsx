// sections/ManageSection.jsx
import { useState, useEffect, useRef } from "react";
import { Table, Popconfirm, Tooltip, message } from "antd";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import DrilldownModal from "./DrilldownModal.jsx";
import api from "../../../../services/axios-interceptore/api";
import { useApiQuery } from "../components/useApiQuery.js";
import { fmtNum, fmtDate } from "../components/utils";
 import { Image, Modal } from "antd";
 import { DeleteOutlined } from "@ant-design/icons";


/* ─────────────────────────────────────────
   DESIGN TOKENS (iOS palette)
───────────────────────────────────────── */
const T = {
  blue:    "#007AFF",
  green:   "#34C759",
  red:     "#FF3B30",
  orange:  "#FF9F0A",
  purple:  "#AF52DE",
  gray6:   "#F2F2F7",
  gray5:   "#E5E5EA",
  gray4:   "#D1D1D6",
  gray3:   "#C7C7CC",
  gray2:   "#AEAEB2",
  gray1:   "#8E8E93",
  label:   "#1C1C1E",
  label2:  "#3A3A3C",
  label3:  "#636366",
  surface: "rgba(255,255,255,0.82)",
  border:  "rgba(0,0,0,0.08)",
};

const STATUS_CFG = {
  Open:     { color: "#007AFF", bg: "rgba(0,122,255,0.10)",  border: "rgba(0,122,255,0.22)"  },
  Pending:  { color: "#FF9F0A", bg: "rgba(255,159,10,0.10)", border: "rgba(255,159,10,0.22)" },
  Resolved: { color: "#34C759", bg: "rgba(52,199,89,0.10)",  border: "rgba(52,199,89,0.22)"  },
};

const STATUSES = ["Open", "Pending", "Resolved"];

/* ─────────────────────────────────────────
   STATUS BADGE (inline, no antd)
───────────────────────────────────────── */
function Badge({ status }) {
  const cfg = STATUS_CFG[status] || { color: T.gray1, bg: T.gray6, border: T.gray5 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {status || "—"}
    </span>
  );
}

/* ─────────────────────────────────────────
   STATUS CHANGE MODAL (remark required)
───────────────────────────────────────── */
function StatusRemarkModal({ complaint, targetStatus, onConfirm, onCancel, loading }) {
  const [remark, setRemark] = useState("");
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef(null);
  const hasError = touched && !remark.trim();

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  const handleConfirm = () => {
    setTouched(true);
    if (!remark.trim()) return;
    onConfirm(remark.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  const fromCfg = STATUS_CFG[complaint.status] || { color: T.gray1 };
  const toCfg   = STATUS_CFG[targetStatus]     || { color: T.gray1 };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 1001,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(460px, calc(100vw - 32px))",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
        overflow: "hidden",
        animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Top accent */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${fromCfg.color}, ${toCfg.color})` }} />

        {/* Header */}
        <div style={{ padding: "20px 22px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: T.gray1, margin: "0 0 4px" }}>
                Status Change
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: T.label, margin: 0, letterSpacing: "-0.3px" }}>
                {complaint.complaintNo}
              </p>
              <p style={{ fontSize: 11, color: T.gray1, margin: "3px 0 0" }}>
                {complaint.customerName} · {complaint.modelName}
              </p>
            </div>
            <button onClick={onCancel} style={{
              width: 30, height: 30, borderRadius: 9, border: "none",
              background: T.gray6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2,
            }}>
              <svg width="12" height="12" fill="none" stroke={T.gray1} strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Status transition arrow */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 16,
            padding: "10px 14px", borderRadius: 12,
            background: T.gray6, border: `1px solid ${T.gray5}`,
          }}>
            <Badge status={complaint.status} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg, ${fromCfg.color}40, ${toCfg.color}40)` }} />
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={T.gray3} strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round"/>
              </svg>
              <div style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg, ${fromCfg.color}40, ${toCfg.color}40)` }} />
            </div>
            <Badge status={targetStatus} />
          </div>
        </div>

        {/* Remark Input */}
        <div style={{ padding: "0 22px 20px" }}>
          <div style={{ marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.label3, display: "flex", alignItems: "center", gap: 4 }}>
              Remark
              <span style={{ color: T.red, fontWeight: 800, fontSize: 12 }}>*</span>
            </label>
            <span style={{ fontSize: 10, color: remark.length > 400 ? T.red : T.gray2, fontFamily: "ui-monospace, monospace" }}>
              {remark.length}/500
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={remark}
            onChange={(e) => { setRemark(e.target.value.slice(0, 500)); setTouched(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Describe the reason for this status change…"
            rows={4}
            style={{
              width: "100%", padding: "10px 13px",
              borderRadius: 12,
              border: `1.5px solid ${hasError ? T.red : remark.trim() ? T.green : T.gray5}`,
              boxShadow: hasError
                ? `0 0 0 3px rgba(255,59,48,0.10)`
                : remark.trim()
                ? `0 0 0 3px rgba(52,199,89,0.10)`
                : "none",
              background: hasError ? "rgba(255,59,48,0.03)" : "#fff",
              fontSize: 13, fontWeight: 500, color: T.label,
              outline: "none", resize: "vertical", minHeight: 90,
              fontFamily: "inherit", lineHeight: 1.6,
              transition: "all 0.15s",
            }}
          />
          {hasError && (
            <p style={{ fontSize: 11, color: T.red, fontWeight: 600, margin: "5px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke={T.red} strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
              </svg>
              Remark is required to proceed
            </p>
          )}
          <p style={{ fontSize: 10, color: T.gray2, margin: "5px 0 0" }}>
            Tip: Press <kbd style={{ padding: "1px 5px", borderRadius: 5, background: T.gray6, border: `1px solid ${T.gray5}`, fontSize: 10 }}>⌘ Enter</kbd> to save
          </p>
        </div>

        {/* Actions */}
        <div style={{
          padding: "12px 22px 18px",
          borderTop: `1px solid ${T.gray5}`,
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button onClick={onCancel} disabled={loading} style={{
            padding: "9px 20px", borderRadius: 11,
            background: T.gray6, border: `1.5px solid ${T.gray5}`,
            fontSize: 13, fontWeight: 700, color: T.label2, cursor: "pointer",
            transition: "all 0.15s", opacity: loading ? 0.5 : 1,
          }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading} style={{
            padding: "9px 24px", borderRadius: 11,
            background: loading ? T.gray4 : `linear-gradient(135deg, ${toCfg.color}, ${toCfg.color}CC)`,
            border: "none",
            fontSize: 13, fontWeight: 800, color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : `0 4px 14px ${toCfg.color}50`,
            transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 8,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? (
              <>
                <svg style={{ animation: "spin 0.7s linear infinite" }} width="13" height="13" fill="none" viewBox="0 0 24 24">
                  <circle opacity="0.3" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                  <path fill="white" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round"/>
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────── */
function DeleteModal({ complaint, onConfirm, onCancel, loading }) {
  return (
    <>
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease",
      }} />
      <div style={{
        position: "fixed", zIndex: 1001,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(380px, calc(100vw - 32px))",
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
        overflow: "hidden",
        animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.red}, #FF6B6B)` }} />
        <div style={{ padding: "24px 22px" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, marginBottom: 14,
            background: "rgba(255,59,48,0.10)", border: `1px solid rgba(255,59,48,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>🗑️</div>
          <p style={{ fontSize: 16, fontWeight: 800, color: T.label, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Delete Complaint?</p>
          <p style={{ fontSize: 12, color: T.gray1, margin: "0 0 4px" }}>
            <strong style={{ color: T.label2, fontFamily: "ui-monospace, monospace" }}>{complaint.complaintNo}</strong> — {complaint.customerName}
          </p>
          <p style={{ fontSize: 11, color: T.gray2, margin: "0 0 20px" }}>This action cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: "9px 0", borderRadius: 11,
              background: T.gray6, border: `1.5px solid ${T.gray5}`,
              fontSize: 13, fontWeight: 700, color: T.label2, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} style={{
              flex: 1, padding: "9px 0", borderRadius: 11,
              background: loading ? T.gray4 : T.red, border: "none",
              fontSize: 13, fontWeight: 800, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 14px rgba(255,59,48,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}>
              {loading
                ? <svg style={{ animation: "spin 0.7s linear infinite" }} width="13" height="13" fill="none" viewBox="0 0 24 24">
                    <circle opacity="0.3" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                    <path fill="white" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"/>
                  </svg>
                : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  </svg>
              }
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   STAT PILL
───────────────────────────────────────── */
function StatPill({ label, count, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "7px 14px", borderRadius: 22,
      cursor: "pointer", transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
      border: `1.5px solid ${active ? (color || T.label) : T.gray5}`,
      background: active
        ? color ? `${color}14` : "rgba(0,0,0,0.06)"
        : "rgba(255,255,255,0.7)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      boxShadow: active ? `0 2px 12px ${color ? color + "30" : "rgba(0,0,0,0.12)"}` : "none",
    }}>
      {color && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? color : T.gray3, flexShrink: 0, transition: "background 0.18s" }} />
      )}
      <span style={{ fontSize: 12, fontWeight: 700, color: active ? (color || T.label) : T.gray1 }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 800,
        padding: "1px 8px", borderRadius: 10,
        background: active ? (color ? `${color}22` : "rgba(0,0,0,0.08)") : T.gray6,
        color: active ? (color || T.label) : T.gray1,
      }}>{fmtNum(count)}</span>
    </button>
  );
}

/* ─────────────────────────────────────────
   SEARCH INPUT
───────────────────────────────────────── */
function SearchInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
      <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <svg width="14" height="14" fill="none" stroke={focused ? T.blue : T.gray3} strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
        </svg>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search complaint, model, part…"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "8px 32px 8px 34px",
          borderRadius: 11, fontSize: 12, fontWeight: 500, color: T.label,
          border: `1.5px solid ${focused ? T.blue : T.gray5}`,
          background: focused ? "#fff" : "rgba(255,255,255,0.7)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          boxShadow: focused ? `0 0 0 3px rgba(0,122,255,0.12)` : "none",
          outline: "none", transition: "all 0.15s", fontFamily: "inherit",
        }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
          width: 18, height: 18, borderRadius: "50%", background: T.gray3,
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   CUSTOMER FILTER SELECT
───────────────────────────────────────── */
const CUSTOMERS = ["GODREJ","HAIER","AMSTRAD","ONIDA","CMI","MARQ","CROMA","BPL","HYUNDAI","SANSUI","VOLTAS","BLUE STAR","SAMSUNG","LG","WHIRLPOOL","DAIKIN","HITACHI","PANASONIC","CARRIER","OTHER"];

function CustomerSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 140 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "8px 32px 8px 12px",
        borderRadius: 11, fontSize: 12, fontWeight: value ? 700 : 500,
        color: value ? T.label : T.gray1,
        border: `1.5px solid ${open ? T.blue : T.gray5}`,
        background: open ? "#fff" : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        boxShadow: open ? `0 0 0 3px rgba(0,122,255,0.12)` : "none",
        cursor: "pointer", outline: "none", transition: "all 0.15s", textAlign: "left", fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {value || "Customer"}
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {value && (
            <span onClick={(e) => { e.stopPropagation(); onChange(""); }} style={{
              width: 16, height: 16, borderRadius: "50%", background: T.gray3,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="8" height="8" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          <svg width="11" height="11" fill="none" stroke={T.gray2} strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
          </svg>
        </span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
          background: "rgba(255,255,255,0.96)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
          borderRadius: 14, border: `1px solid ${T.gray5}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden",
          maxHeight: 240, overflowY: "auto",
        }}>
          {CUSTOMERS.map((c) => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }} style={{
              width: "100%", padding: "8px 14px", textAlign: "left",
              background: value === c ? "rgba(0,122,255,0.08)" : "transparent",
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: value === c ? 700 : 500,
              color: value === c ? T.blue : T.label, fontFamily: "inherit",
              borderBottom: `1px solid ${T.gray6}`,
              transition: "background 0.1s",
            }}>{c}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   STATUS CHANGE DROPDOWN (inline in table)
───────────────────────────────────────── */
function StatusDropdown({ complaint, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = STATUS_CFG[complaint.status] || {};

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px 4px 8px", borderRadius: 20,
          background: cfg.bg || T.gray6,
          border: `1px solid ${open ? cfg.color || T.blue : cfg.border || T.gray5}`,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 11, fontWeight: 700, color: cfg.color || T.label2,
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s", boxShadow: open ? `0 0 0 3px ${cfg.color}20` : "none",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color || T.gray3, flexShrink: 0 }} />
        {complaint.status}
        <svg width="9" height="9" fill="none" stroke={cfg.color || T.gray1} strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ marginLeft: 2, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 200,
          background: "rgba(255,255,255,0.97)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
          borderRadius: 14, border: `1px solid ${T.gray5}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)", overflow: "hidden", minWidth: 130,
        }}>
          {STATUSES.filter((s) => s !== complaint.status).map((s, i) => {
            const c = STATUS_CFG[s] || {};
            return (
              <button key={s} onClick={() => { setOpen(false); onSelect(s); }}
                style={{
                  width: "100%", padding: "9px 14px",
                  display: "flex", alignItems: "center", gap: 8,
                  background: "transparent", border: "none",
                  borderBottom: i < STATUSES.filter(x => x !== complaint.status).length - 1 ? `1px solid ${T.gray6}` : "none",
                  cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = c.bg}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{s}</span>
                <svg style={{ marginLeft: "auto" }} width="11" height="11" fill="none" stroke={c.color} strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round"/>
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function ManageSection({ addToast }) {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(12);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [custFilter, setCust]     = useState("");
  const [selected, setSelected]   = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  // Status change modal state
  const [statusModal, setStatusModal] = useState(null); // { complaint, targetStatus }
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState(null); // complaint
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, isLoading, refetch } = useApiQuery(
    "/get-complaints",
    { page, limit: pageSize, search, status: statusFilter, customerName: custFilter },
    { onError: () => addToast?.("Failed to load complaints", "error") }
  );

  const user = JSON.parse(localStorage.getItem("User") || "{}");
  const actions = user?.roleId?.action || [];
  const canDelete = user.isSystemRole || actions.includes("delete");
  const canUpdate = user.isSystemRole || actions.includes("edit");

  const list  = data?.complaints || [];
  const total = data?.total || 0;
  const statusCounts = data?.statusCounts ||
    STATUSES.reduce((acc, s) => ({ ...acc, [s]: list.filter((r) => r.status === s).length }), {});

  /* ── Status change with remark ── */
  const handleStatusSelect = (complaint, targetStatus) => {
    setStatusModal({ complaint, targetStatus });
  };

  const handleStatusConfirm = async (remark) => {
    if (!statusModal) return;
    setStatusLoading(true);
    try {
      const res = await api.post("/complaints/status", {
        id: statusModal.complaint._id,
        status: statusModal.targetStatus,
        remarks: remark,
      });
      message.success(`Status updated to "${statusModal.targetStatus}"`);
      setStatusModal(null);
      refetch();
    } catch (err) {
      message.error(res.data.err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const {data} = await api.post("/complaints/delete", { id: deleteModal._id });
      message.success("Complaint deleted");
      setDeleteModal(null);
      refetch();
      if (selected?._id === deleteModal._id) setSelected(null);
    } catch (err) {
      message.error(data.err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── Columns ── */

const columns = [
  {
    title: "S.N.",
    width: 50,
    fixed: "left",
    render: (_, __, i) => (
      <span style={{ fontSize: 11 }}>
        {i + 1 + (page - 1) * pageSize}
      </span>
    ),
  },

    {
      title: "Complaint No",
      dataIndex: "complaintNo",
      width: 130,
      render: (v, r) => (
        <span
          onClick={(e) => {
            e.stopPropagation();   // safety
            setSelected(r);
          }}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#1677ff",
            cursor: "pointer",
            textDecoration: "underline",
            fontFamily: "ui-monospace, monospace",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.7)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
        >
          {v}
        </span>
      ),
    },
  {
    title: "Date",
    dataIndex: "complaintDate",
    width: 140,
    render: (v) => fmtDate(v),
  },

  {
    title: "Customer",
    dataIndex: "customerName",
    width: 120,
  },

  {
    title: "Commodity",
    dataIndex: "commodity",
    width: 90,
  },

  {
    title: "Model",
    dataIndex: "modelName",
    width: 120,
  },

  {
    title: "Serial No",
    dataIndex: "serialNo",
    width: 140,
  },

  {
    title: "Part No",
    dataIndex: "partNo",
    width: 120,
  },

  {
    title: "Defect Category",
    dataIndex: "defectCategory",
    width: 250,
  },

  {
    title: "Defect",
    dataIndex: "defectDetails",
    width: 180,
    ellipsis: true,
  },

  {
    title: "Part",
    dataIndex: "defectivePart",
    width: 140,
  },

  {
    title: "DOA",
    dataIndex: "doa",
    width: 90,
    render: (v) =>
      v ? <span style={{ fontWeight: 600 }}>{v}</span> : "—",
  },

  {
    title: "Mfg. Date",
    dataIndex: "manufacturingDate",
    width: 110,
    render: (v) => (v ? fmtDate(v) : "—"),
  },

  {
    title: "Plant",
    dataIndex: "manufacturingPlant",
    width: 120,
  },

  {
    title: "City",
    dataIndex: "city",
    width: 100,
  },

  {
    title: "Status",
    dataIndex: "status",
    width: 100,
    render: (v) => <Badge status={v} />,
  },

  // ✅ IMAGE COLUMN (IMPORTANT)
  {
    title: "Image",
    dataIndex: "imageUrl",
    width: 90,
    render: (url) =>
      url ? (
        <Image
          src={url}
          alt="complaint"
          width={32}
          height={32}
          style={{ borderRadius: 6, cursor: "pointer", objectFit: "cover" }}
          preview={{
            mask: "View",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setPreviewImg(url)}
          }
        />
      ) : (
        "No Evidence"
      ),
  },

  ...(canUpdate
    ? [
        {
          title: "Change Status",
          width: 150,
          render: (_, r) => (
            <StatusDropdown
              complaint={r}
              onSelect={(s) => handleStatusSelect(r, s)}
            />
          ),
        },
      ]
    : []),

  ...(canDelete
    ? [
        {
          title: "Actions",
          width: 80,
          render: (_, r) => (
            <button onClick={() => setDeleteModal(r)} className="cursor-pointer bg-red-400/20 " > 
              <DeleteOutlined style={{fontSize:18, color:"red"}} />
            </button>
          ),
        },
      ]
    : []),
];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .manage-root *, .manage-root *::before, .manage-root *::after {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif !important;
          -webkit-font-smoothing: antialiased;
        }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
        @keyframes spin    { to   { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }

        /* Ant Design table overrides — iOS feel */
        .manage-root .ant-table-thead > tr > th {
          // background: #1C1C1E !important;
          color: #636366 !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.7px !important;
          border-bottom: none !important;
          padding: 10px 12px !important;
        }
        .manage-root .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(0,0,0,0.04) !important;
          padding: 9px 12px !important;
          transition: background 0.12s !important;
        }
        // .manage-root .ant-table-tbody > tr:hover > td {
        //   background: rgba(0,122,255,0.4) !important;
        // }
        .manage-root .ant-table-tbody > tr:nth-child(even) > td {
          background: rgba(0,0,0,0.012);
        }
        .manage-root .ant-table-tbody > tr:nth-child(even):hover > td {
          background: rgba(0,122,255,0.04) !important;
        }
        .manage-root .ant-table {
          background: rgb(255, 255, 255) !important;
        }
        .manage-root .ant-table-container {
          border-radius: 0 !important;
        }
        .manage-root .ant-pagination {
          padding: 10px 16px !important;
          border-top: 1px solid rgba(0,0,0,0.05) !important;
          margin: 0 !important;
          background: rgba(255,255,255,0.5) !important;
        }
        .manage-root .ant-pagination-item-active {
          background: #007AFF !important;
          border-color: #007AFF !important;
        }
        .manage-root .ant-pagination-item-active a { color: #fff !important; }
        .manage-root .ant-table-wrapper { border-radius: 0 !important; }
        .manage-root .ant-spin-dot-item { background: #007AFF !important; }

        /* Scrollbar */
        .manage-root ::-webkit-scrollbar { height: 4px; width: 4px; }
        .manage-root ::-webkit-scrollbar-track { background: transparent; }
        .manage-root ::-webkit-scrollbar-thumb { background: #C7C7CC; border-radius: 99px; }
      `}</style>

      <div className="manage-root" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.35s ease both" }}>

        {/* ── Status Pills ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <StatPill
            label="All"
            count={total}
            active={!statusFilter}
            onClick={() => { setStatus(""); setPage(1); }}
          />
          {STATUSES.map((s) => (
            <StatPill
              key={s}
              label={s}
              count={statusCounts[s] ?? 0}
              color={STATUS_CFG[s]?.color}
              active={statusFilter === s}
              onClick={() => { setStatus(statusFilter === s ? "" : s); setPage(1); }}
            />
          ))}
        </div>

        {/* <Modal
          open={!!previewImg}
          footer={null}
          onCancel={() => setPreviewImg(null)}
        >
          <img src={previewImg} style={{ width: "100%" }} />
        </Modal> */}

        {/* ── Filters Row ── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <CustomerSelect value={custFilter} onChange={(v) => { setCust(v); setPage(1); }} />

          {/* Refresh */}
          <button onClick={refetch} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 11,
            background: "rgba(255,255,255,0.7)", border: `1.5px solid ${T.gray5}`,
            fontSize: 12, fontWeight: 700, color: T.label2,
            cursor: "pointer", transition: "all 0.15s",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          }}>
            <svg width="13" height="13" fill="none" stroke={T.label2} strokeWidth="2.2" viewBox="0 0 24 24" style={{ animation: isLoading ? "spin 0.8s linear infinite" : "none" }}>
              <path d="M3 12a9 9 0 019-9 9 9 0 016.36 2.64" strokeLinecap="round"/>
              <polyline points="21 3 15 3 15 9" strokeLinecap="round"/>
            </svg>
            Refresh
          </button>

          {/* Active filter indicator */}
          {(search || statusFilter || custFilter) && (
            <button
              onClick={() => { setSearch(""); setStatus(""); setCust(""); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 11,
                background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)",
                fontSize: 12, fontWeight: 700, color: T.red, cursor: "pointer",
              }}>
              <svg width="10" height="10" fill="none" stroke={T.red} strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* ── Table Card ── */}
        <div style={{
          background: T.surface,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.72)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {/* Card Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", borderBottom: `1px solid ${T.border}`,
            background: "rgba(255,255,255,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, fontSize: 14,
                background: "linear-gradient(135deg, rgba(0,122,255,0.15), rgba(0,122,255,0.05))",
                border: "1px solid rgba(0,122,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>⚙️</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: T.label, margin: 0, letterSpacing: "-0.2px" }}>
                  Manage Complaints
                </p>
                <p style={{ fontSize: 10, color: T.gray1, margin: "1px 0 0" }}>
                  {fmtNum(total)} total records
                </p>
              </div>
            </div>
          </div>

          <Table
            dataSource={list}
            columns={columns}
            rowKey={(r) => r._id}
            loading={isLoading}
            size="small"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ["10", "12", "20", "50"],
              size: "small",
              showTotal: (t, [s, e]) => (
                <span style={{ fontSize: 11, color: T.gray1, fontFamily: "ui-monospace, monospace" }}>
                  <strong style={{ color: T.label }}>{s}–{e}</strong> of <strong style={{ color: T.label }}>{t}</strong>
                </span>
              ),
            }}
            onChange={(p) => { setPage(p.current); setPageSize(p.pageSize); }}
            scroll={{ x: 1600, y: 470 }}
            // style={{ fontSize: 11 }}
            onRow={() => ({
            style: { fontSize: 11 },
          })}
          />
        </div>

        {/* Drilldown Modal */}
        {selected && (
          <DrilldownModal
            open
            onClose={() => setSelected(null)}
            title={`Complaint — ${selected.complaintNo}`}
            subtitle={`${selected.customerName} · ${fmtDate(selected.complaintDate)}`}
            data={selected}
            type="detail"
          />
        )}
      </div>

      {/* Status Change Modal */}
      {statusModal && (
        <StatusRemarkModal
          complaint={statusModal.complaint}
          targetStatus={statusModal.targetStatus}
          loading={statusLoading}
          onConfirm={handleStatusConfirm}
          onCancel={() => !statusLoading && setStatusModal(null)}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <DeleteModal
          complaint={deleteModal}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleteLoading && setDeleteModal(null)}
        />
      )}
    </>
  );
}