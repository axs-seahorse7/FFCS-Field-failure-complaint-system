import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/axios-interceptore/api.js";

/* ─── Logo ─── */
const Logo = () => (
  <div style={{
    width: 60, height: 60, borderRadius: 10,
    
  }}>
  <img src="/pg-logo-Photoroom (1).png" alt="" />
</div>
);

const RESEND_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const startTimer = useCallback(() => {
    setTimer(RESEND_SECONDS);
    setCanResend(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid work email address.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/login", { email });
      setLoading(false);
      setAnimating(true);
      setTimeout(() => {
        setStep(2); setAnimating(false); startTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 120);
      }, 350);
      setSuccess("OTP sent to your email.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setLoading(false);
      setError(err?.response?.data?.message || "Failed to send OTP. Please try again.");
    }
  };

  const handleOtpChange = (index, value) => {
    const val = value.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[index] = val; setOtp(next); setError("");
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) { otpRefs.current[index - 1]?.focus(); }
      else { const n = [...otp]; n[index] = ""; setOtp(n); }
    }
    if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) { setOtp(paste.split("")); otpRefs.current[5]?.focus(); e.preventDefault(); }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (otp.join("").length < 6) { setError("Please enter all 6 digits of your OTP."); return; }
    setLoading(true);
    try {
      const response = await api.post("/auth/verify-otp", { email, otp: otp.join("") });
      const token = response?.data?.token;
      if (token) document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=3600; samesite=lax`;
      const role = response?.data?.role;
      if (role) document.cookie = `role=${encodeURIComponent(role)}; path=/; max-age=3600; samesite=lax`;
      setLoading(false);
      setSuccess("Login successful.");
      setTimeout(() => {
        if (response?.data?.role === "admin") navigate("/dashboard", { replace: true });
        else navigate("/complaints", { replace: true });
      }, 500);
    } catch (err) {
      setLoading(false);
      setError(err?.response?.data?.message || "Invalid OTP. Please try again.");
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(["", "", "", "", "", ""]); setError("");
    setSuccess("A new OTP has been sent to your email."); startTimer();
    setTimeout(() => setSuccess(""), 3500);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pg-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Sora', sans-serif;
          background: #f1f5f9;
          overflow: hidden;
        }

        /* ── LEFT PANEL ── */
        .pg-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 60px;
          position: relative;
          overflow: hidden;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
        }

        /* Subtle decorative background */
        .pg-left-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 10% 5%, rgba(229,57,53,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 90% 95%, rgba(59,130,246,0.05) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Light dot grid */
        .pg-grid {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle, #cbd5e1 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          opacity: 0.55;
          mask-image: radial-gradient(ellipse 85% 85% at 30% 40%, black 30%, transparent 100%);
        }

        .pg-left-top { position: relative; z-index: 1; }

        .pg-brand {
          display: flex; align-items: center; gap: 14px;
          opacity: 0; transform: translateY(-16px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .pg-brand.vis { opacity: 1; transform: none; }
        .pg-brand-name { font-size: 21px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
        .pg-brand-desc {
          font-size: 10px; font-weight: 600; color: #e53935;
          letter-spacing: 2.5px; text-transform: uppercase;
          font-family: 'DM Mono', monospace; margin-top: 2px;
        }

        .pg-left-mid {
          position: relative; z-index: 1;
          opacity: 0; transform: translateY(26px);
          transition: opacity 0.65s ease 0.18s, transform 0.65s ease 0.18s;
        }
        .pg-left-mid.vis { opacity: 1; transform: none; }

        .pg-headline {
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 800; color: #0f172a;
          line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 18px;
        }
        .pg-headline em {
          font-style: normal;
          background: linear-gradient(90deg, #e53935 0%, #f97316 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pg-headline-sub {
          font-size: 14.5px; font-weight: 400;
          color: #64748b; line-height: 1.75; max-width: 380px;
        }

        .pg-features { margin-top: 44px; display: flex; flex-direction: column; gap: 18px; }
        .pg-feat { display: flex; align-items: flex-start; gap: 14px; }
        .pg-feat-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: #fff5f5; border: 1px solid #fecaca;
          display: flex; align-items: center; justify-content: center;
        }
        .pg-feat-title { font-size: 13.5px; font-weight: 700; color: #1e293b; }
        .pg-feat-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; line-height: 1.5; }

        .pg-left-bottom {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          opacity: 0; transition: opacity 0.5s ease 0.4s;
        }
        .pg-left-bottom.vis { opacity: 1; }

        .pg-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 20px;
          font-size: 10px; color: #64748b;
          font-family: 'DM Mono', monospace; letter-spacing: 0.8px;
          background: #f8fafc;
        }
        .pg-badge-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #22c55e;
          animation: blink 2.2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        /* ── RIGHT PANEL ── */
        .pg-right {
          width: 480px; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 48px 44px;
          background: #f8fafc;
          border-left: 1px solid #e2e8f0;
          position: relative; flex-shrink: 0; overflow: hidden;
        }

        /* Subtle top-right orb */
        .pg-right::before {
          content: '';
          position: absolute; top: -140px; right: -140px;
          width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(229,57,53,0.05) 0%, transparent 65%);
          pointer-events: none;
        }

        /* ── CARD ── */
        .pg-card {
          width: 100%; max-width: 390px;
          opacity: 0; transform: translateX(22px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
        }
        .pg-card.vis { opacity: 1; transform: none; }

        /* Card container box */
        .pg-card-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 36px 32px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
        }

        /* Step dots */
        .pg-steps-row { display: flex; align-items: center; gap: 8px; margin-bottom: 28px; }
        .pg-step-dot {
          height: 4px; border-radius: 2px;
          background: #e2e8f0;
          transition: background 0.35s ease, width 0.35s ease;
          width: 28px;
        }
        .pg-step-dot.done { background: #e53935; }
        .pg-step-dot.current { background: #e53935; width: 44px; }

        /* Step panels */
        .pg-step-wrap { position: relative; }
        .pg-panel {
          opacity: 0; transform: translateX(28px);
          transition: opacity 0.36s ease, transform 0.36s ease;
          pointer-events: none; position: absolute; top: 0; left: 0; width: 100%;
        }
        .pg-panel.active { opacity: 1; transform: none; pointer-events: auto; position: relative; }
        .pg-panel.exit { opacity: 0; transform: translateX(-28px); }

        .card-eyebrow {
          font-size: 10.5px; font-weight: 600; color: #e53935;
          letter-spacing: 2.5px; text-transform: uppercase;
          font-family: 'DM Mono', monospace; margin-bottom: 10px;
        }
        .card-title { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; line-height: 1.2; }
        .card-sub {
          margin-top: 7px; font-size: 13.5px;
          color: #94a3b8; font-weight: 400; line-height: 1.65;
        }
        .card-sub strong { color: #475569; font-weight: 600; }

        /* Fields */
        .field-wrap { display: flex; flex-direction: column; gap: 6px; margin-top: 24px; }
        .field-label {
          font-size: 11px; font-weight: 600; color: #64748b;
          letter-spacing: 1px; text-transform: uppercase;
          font-family: 'DM Mono', monospace;
        }
        .field-input {
          width: 100%; padding: 12px 14px;
          background: #f8fafc; border: 1.5px solid #e2e8f0;
          border-radius: 10px; color: #1e293b; font-size: 14px;
          font-family: 'Sora', sans-serif; font-weight: 500; outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: #cbd5e1; }
        .field-input:focus {
          border-color: #e53935;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
        }
        .field-input[readonly] {
          color: #94a3b8; cursor: default;
          background: #f1f5f9; border-color: #e2e8f0;
        }

        /* OTP */
        .otp-row { display: flex; gap: 9px; margin-top: 20px; }
        .otp-box {
          flex: 1; aspect-ratio: 1; max-width: 54px;
          background: #f8fafc; border: 1.5px solid #e2e8f0;
          border-radius: 12px; color: #1e293b; font-size: 22px; font-weight: 700;
          font-family: 'DM Mono', monospace; text-align: center; outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
          caret-color: #e53935;
        }
        .otp-box:focus {
          border-color: #e53935; background: #fff;
          box-shadow: 0 0 0 3px rgba(229,57,53,0.1);
          transform: translateY(-2px);
        }
        .otp-box.filled { border-color: #fca5a5; background: #fff5f5; color: #e53935; }
        .otp-box.err-box { border-color: #fca5a5 !important; background: #fff5f5 !important; }

        /* Resend */
        .resend-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px;
        }
        .resend-timer {
          font-size: 12px; font-family: 'DM Mono', monospace;
          color: #94a3b8; letter-spacing: 0.3px;
        }
        .resend-btn {
          font-size: 13px; font-weight: 600; color: #e53935;
          background: none; border: none; cursor: pointer;
          font-family: 'Sora', sans-serif; transition: color 0.2s; padding: 0;
        }
        .resend-btn:disabled { color: #cbd5e1; cursor: not-allowed; }
        .resend-btn:not(:disabled):hover { color: #b91c1c; }

        /* Feedback */
        .feedback {
          display: flex; align-items: flex-start; gap: 9px;
          padding: 10px 13px; border-radius: 9px;
          font-size: 13px; margin-top: 16px; line-height: 1.5; font-weight: 500;
        }
        .feedback.err {
          background: #fff5f5; border: 1px solid #fecaca; color: #dc2626;
        }
        .feedback.ok {
          background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a;
        }

        /* Submit button */
        .submit-btn {
          width: 100%; padding: 13.5px; margin-top: 22px;
          background: linear-gradient(135deg, #e53935 0%, #b71c1c 100%);
          border: none; border-radius: 11px; color: #fff;
          font-size: 14.5px; font-weight: 700; cursor: pointer;
          font-family: 'Sora', sans-serif; letter-spacing: -0.2px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(229,57,53,0.3);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.92; transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(229,57,53,0.38);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; color: #94a3b8;
          font-size: 13px; cursor: pointer;
          font-family: 'Sora', sans-serif; transition: color 0.2s;
          margin-top: 18px; padding: 0; font-weight: 500;
        }
        .back-btn:hover { color: #475569; }

        .security-note {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 22px; font-size: 11px; color: #cbd5e1;
          font-family: 'DM Mono', monospace; letter-spacing: 0.3px;
        }

        /* Divider between card and security note */
        .pg-divider {
          height: 1px; background: #f1f5f9; margin: 20px 0 0;
        }

        @media (max-width: 860px) {
          .pg-left { display: none; }
          .pg-right { width: 100%; border-left: none; background: #f8fafc; }
        }
      `}</style>

      <div className="pg-root">

        {/* ══ LEFT PANEL ══ */}
        <div className="pg-left">
          <div className="pg-left-bg" />
          <div className="pg-grid" />

          {/* Brand */}
          <div className="pg-left-top">
            <div className={`pg-brand ${mounted ? "vis" : ""}`}>
              <Logo />
              <div>
                <div className="pg-brand-name">PG Group</div>
                <div className="pg-brand-desc">Field Failure System</div>
              </div>
            </div>
          </div>

          {/* Headline + features */}
          <div className={`pg-left-mid ${mounted ? "vis" : ""}`}>
            <div className="pg-headline">
              Manage defects<br />with complete<br /><em>confidence.</em>
            </div>
            <div className="pg-headline-sub">
              PG FFS gives your team a single source of truth for field complaints, warranty tracking, and supplier action plans.
            </div>

            <div className="pg-features">
              {[
                {
                  icon: (
                    <svg width="16" height="16" fill="none" stroke="#e53935" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                  title: "Passwordless & Secure",
                  sub: "OTP delivered via encrypted email — no passwords to manage",
                },
                {
                  icon: (
                    <svg width="16" height="16" fill="none" stroke="#e53935" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  ),
                  title: "60-Second Expiry",
                  sub: "Time-bound codes prevent replay and brute-force attacks",
                },
                {
                  icon: (
                    <svg width="16" height="16" fill="none" stroke="#e53935" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  ),
                  title: "Cross-Device Access",
                  sub: "Sign in seamlessly from any device or browser",
                },
              ].map((f) => (
                <div className="pg-feat" key={f.title}>
                  <div className="pg-feat-icon">{f.icon}</div>
                  <div>
                    <div className="pg-feat-title">{f.title}</div>
                    <div className="pg-feat-sub">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badges */}
          <div className={`pg-left-bottom ${mounted ? "vis" : ""}`}>
            <div className="pg-badge"><div className="pg-badge-dot" />ALL SYSTEMS OPERATIONAL</div>
            <div className="pg-badge">SOC 2</div>
            <div className="pg-badge">GDPR</div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="pg-right">
          <div className={`pg-card ${mounted ? "vis" : ""}`}>

            {/* Card box */}
            <div className="pg-card-box">

              {/* Step progress dots */}
              <div className="pg-steps-row">
                <div className={`pg-step-dot ${step === 1 ? "current" : "done"}`} />
                <div className={`pg-step-dot ${step === 2 ? "current" : step > 2 ? "done" : ""}`} />
              </div>

              <div className="pg-step-wrap">

                {/* ── STEP 1: Email ── */}
                <div className={`pg-panel ${step === 1 && !animating ? "active" : step === 1 && animating ? "exit" : ""}`}>
                  <div className="card-eyebrow">Step 1 of 2</div>
                  <div className="card-title">Welcome back</div>
                  <div className="card-sub">Enter your email and we'll send a one-time passcode.</div>

                  <form onSubmit={handleEmailSubmit} autoComplete="on">
                    <div className="field-wrap">
                      <label className="field-label">Work Email</label>
                      <input
                        className="field-input"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        autoComplete="email"
                      />
                    </div>

                    {error && (
                      <div className="feedback err">
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                      </div>
                    )}

                    <button className="submit-btn" type="submit" disabled={loading}>
                      {loading ? <><div className="spinner" />Sending OTP…</> : "Send OTP →"}
                    </button>
                  </form>

                  <div className="pg-divider" />
                  <div className="security-note">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Secured with 256-bit TLS encryption
                  </div>
                </div>

                {/* ── STEP 2: OTP ── */}
                <div className={`pg-panel ${step === 2 && !animating ? "active" : ""}`}>
                  <div className="card-eyebrow">Step 2 of 2</div>
                  <div className="card-title">Check your inbox</div>
                  <div className="card-sub">
                    A 6-digit code was sent to<br />
                    <strong>{email}</strong>
                  </div>

                  <form onSubmit={handleOtpSubmit}>
                    <div className="field-wrap">
                      <label className="field-label">Email Address</label>
                      <input className="field-input" type="email" value={email} readOnly tabIndex={-1} />
                    </div>

                    <div className="otp-row" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => (otpRefs.current[i] = el)}
                          className={`otp-box${digit ? " filled" : ""}${error && !digit ? " err-box" : ""}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          aria-label={`OTP digit ${i + 1}`}
                        />
                      ))}
                    </div>

                    <div className="resend-row">
                      <span className="resend-timer">
                        {canResend ? "Code expired" : `Resend in ${fmt(timer)}`}
                      </span>
                      <button type="button" className="resend-btn" disabled={!canResend} onClick={handleResend}>
                        Resend OTP
                      </button>
                    </div>

                    {error && (
                      <div className="feedback err">
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="feedback ok">
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {success}
                      </div>
                    )}

                    <button className="submit-btn" type="submit" disabled={loading}>
                      {loading ? <><div className="spinner" />Verifying OTP…</> : "Verify & Sign In →"}
                    </button>
                  </form>

                  <button
                    className="back-btn"
                    onClick={() => {
                      setStep(1);
                      setOtp(["", "", "", "", "", ""]);
                      setError(""); setSuccess("");
                      clearInterval(timerRef.current);
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Use a different email
                  </button>

                  <div className="pg-divider" />
                  <div className="security-note">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    Code expires in 60 seconds · Single use only
                  </div>
                </div>

              </div>
            </div>
            {/* End card box */}

          </div>
        </div>

      </div>
    </>
  );
}
