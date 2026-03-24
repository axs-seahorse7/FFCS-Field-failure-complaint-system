import { useState } from "react";

export default function AccountPending() {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequest = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRequested(true);
    }, 1800);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', sans-serif;
          background: #f5f5f7;
          min-height: 100vh;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: #f5f5f7;
        }

        .card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e8e8ed;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          padding: 48px 40px;
          width: 100%;
          max-width: 440px;
          animation: fadeUp 0.5s ease both;
          text-align: center;
        }

        @media (max-width: 480px) {
          .card { padding: 36px 24px; border-radius: 16px; }
        }

        .icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .icon-circle.amber { background: #fff7ed; }
        .icon-circle.green { background: #f0fdf4; animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 16px;
        }
        .badge.amber { background: #fff7ed; color: #c2410c; }
        .badge.green { background: #f0fdf4; color: #15803d; }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }
        .badge.amber .badge-dot { background: #f97316; animation: blink 1.4s ease-in-out infinite; }
        .badge.green  .badge-dot { background: #22c55e; }

        .title {
          font-size: 22px;
          font-weight: 600;
          color: #1a1a1a;
          letter-spacing: -0.3px;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .subtitle {
          font-size: 14px;
          color: #6e6e73;
          line-height: 1.65;
          margin-bottom: 32px;
          font-weight: 400;
        }

        .info-box {
          background: #f5f5f7;
          border-radius: 12px;
          padding: 4px 0;
          margin-bottom: 28px;
          text-align: left;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 16px;
          border-bottom: 1px solid #ebebf0;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label {
          font-size: 13px;
          color: #8e8e93;
          font-weight: 400;
        }
        .info-value {
          font-size: 13px;
          color: #1a1a1a;
          font-weight: 500;
        }
        .info-value.orange { color: #ea580c; }

        .btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-primary {
          background: #1a1a1a;
          color: #ffffff;
        }
        .btn-primary:hover:not(:disabled) {
          background: #333;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
          flex-shrink: 0;
        }

        .help {
          margin-top: 18px;
          font-size: 13px;
          color: #8e8e93;
        }
        .help a {
          color: #1a1a1a;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: #ccc;
          transition: text-decoration-color 0.15s;
        }
        .help a:hover { text-decoration-color: #1a1a1a; }

        .notice {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          text-align: left;
          margin-bottom: 24px;
          animation: fadeUp 0.35s ease both;
        }
        .notice-icon { flex-shrink: 0; margin-top: 1px; }
        .notice-text { font-size: 13px; color: #166534; line-height: 1.55; }
        .notice-text strong { font-weight: 600; }

        .footer {
          margin-top: 28px;
          font-size: 12px;
          color: #aeaeb2;
          text-align: center;
        }
        .footer a { color: #aeaeb2; }
      `}</style>

      <div className="page">
        <div className="card">
          {!requested ? (
            <>
              <div className="icon-circle amber">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="13" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5 3"/>
                  <circle cx="14" cy="10" r="3.5" fill="#f97316"/>
                  <path d="M7 22.5c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>

              <div className="badge amber">
                <span className="badge-dot"/>
                Pending Review
              </div>

              <h1 className="title">Account under review</h1>
              <p className="subtitle">
                We're verifying your details. This usually takes 1–2 business days. Need it sooner? Request manual activation below.
              </p>

              <div className="info-box">
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">alex@example.com</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value orange">Pending</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Submitted</span>
                  <span className="info-value">Mar 22, 2026</span>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleRequest} disabled={loading}>
                {loading ? (
                  <><span className="spinner"/> Sending request…</>
                ) : (
                  "Request Manual Activation"
                )}
              </button>

              <p className="help">
                Questions? <a href="#">Contact support</a>
              </p>
            </>
          ) : (
            <>
              <div className="icon-circle green">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="13" fill="#22c55e" fillOpacity="0.15"/>
                  <path d="M9 14.5l3.5 3.5L19 11" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="badge green">
                <span className="badge-dot"/>
                Request Sent
              </div>

              <h1 className="title">You're on the list</h1>
              <p className="subtitle">
                Your activation request has been received. We'll email you as soon as your account is ready.
              </p>

              <div className="notice">
                <span className="notice-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.2"/>
                    <path d="M8 5v4M8 11v.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="notice-text">
                  Confirmation sent to <strong>alex@example.com</strong>. Check your inbox — it may take a few minutes.
                </span>
              </div>

              <div className="info-box">
                <div className="info-row">
                  <span className="info-label">Request ID</span>
                  <span className="info-value">#ACT-20483</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Response time</span>
                  <span className="info-value">Within 24 hours</span>
                </div>
              </div>

              <p className="help">
                Still waiting? <a href="#">Contact support</a>
              </p>
            </>
          )}
        </div>

        <p className="footer">
          © 2026 Acme Inc. &nbsp;·&nbsp; <a href="#">Privacy</a> &nbsp;·&nbsp; <a href="#">Terms</a>
        </p>
      </div>
    </>
  );
}
