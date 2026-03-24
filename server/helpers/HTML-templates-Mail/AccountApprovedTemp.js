export const accountApprovedTemplate = ({ email }) => {
	const url = process.env.CLIENT_URL;
	return ` 	<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
			<title>Account Approved – PG-Group</title>
			<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,700;1,700&display=swap" rel="stylesheet"/>
			<style>
				@keyframes fadeDown {
					from { opacity: 0; transform: translateY(-16px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				@keyframes fadeUp {
					from { opacity: 0; transform: translateY(16px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				@keyframes popIn {
					0%   { opacity: 0; transform: scale(0.5); }
					75%  { transform: scale(1.1); }
					100% { opacity: 1; transform: scale(1); }
				}
				@keyframes pulse {
					0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3); }
					50%       { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
				}
				@keyframes shimmer {
					0%   { background-position: -200% center; }
					100% { background-position: 200% center; }
				}

				* { box-sizing: border-box; margin: 0; padding: 0; }

				body {
					background-color: #f0f4f8;
					font-family: 'Inter', sans-serif;
					-webkit-font-smoothing: antialiased;
				}

				.wrapper {
					padding: 48px 16px;
					background-color: #f0f4f8;
				}

				.card {
					max-width: 480px;
					margin: 0 auto;
					background: #ffffff;
					border-radius: 16px;
					border: 1.5px solid #d1fae5;
					box-shadow:
						0 0 0 4px rgba(209, 250, 229, 0.4),
						0 20px 48px rgba(0, 0, 0, 0.08);
					overflow: hidden;
					animation: fadeDown 0.6s cubic-bezier(.22,1,.36,1) both;
				}

				/* ── HEADER ── */
				.header {
					padding: 32px 32px 24px;
					text-align: center;
					border-bottom: 1.5px solid #f0fdf4;
					background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
				}

				.logo-row {
					display: flex;
					justify-content: center;
					margin-bottom: 18px;
					animation: fadeDown 0.6s 0.1s cubic-bezier(.22,1,.36,1) both;
				}
				.logo-row img {
					max-height: 40px;
				}

				.company-row {
					animation: fadeDown 0.6s 0.18s cubic-bezier(.22,1,.36,1) both;
				}
				.company-name {
					font-family: 'Fraunces', serif;
					font-size: 22px;
					color: #111827;
					letter-spacing: -0.3px;
				}
				.company-name span {
					color: red;
				}
				.company-sub {
					font-size: 11px;
					letter-spacing: 2.5px;
					text-transform: uppercase;
					color: black;
					margin-top: 4px;
				}

				/* ── BADGE ── */
				.badge-section {
					padding: 32px 32px 0;
					text-align: center;
					animation: fadeUp 0.6s 0.25s cubic-bezier(.22,1,.36,1) both;
				}
				.badge {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 72px;
					height: 72px;
					border-radius: 50%;
					background: #f0fdf4;
					border: 2px solid #bbf7d0;
					font-size: 32px;
					animation: popIn 0.5s 0.45s cubic-bezier(.22,1,.36,1) both,
					           pulse 2.8s 1s ease-in-out infinite;
				}

				/* ── BODY ── */
				.body {
					padding: 20px 36px 36px;
					text-align: center;
					animation: fadeUp 0.6s 0.3s cubic-bezier(.22,1,.36,1) both;
				}

				.welcome-tag {
					display: inline-block;
					background: #f0fdf4;
					border: 1px solid #bbf7d0;
					border-radius: 30px;
					padding: 4px 14px;
					font-size: 11px;
					font-weight: 600;
					letter-spacing: 1.5px;
					text-transform: uppercase;
					color: #16a34a;
					margin-bottom: 14px;
				}

				.title {
					font-size: 20px;
					color: #111827;
					line-height: 1.25;
					margin-bottom: 10px;
					letter-spacing: -0.4px;
				}
				.title em {
					
					background: linear-gradient(90deg, #16a34a, #4ade80, #16a34a);
					background-size: 200% auto;
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
					animation: shimmer 3s linear infinite;
				}

				.desc {
					font-size: 14px;
					color: #6b7280;
					line-height: 1.75;
					margin-bottom: 24px;
				}
				.desc strong { color: #374151; font-weight: 600; }

				/* ── DIVIDER ── */
				.divider {
					height: 1px;
					background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
					margin: 0 0 24px;
				}

				/* ── INFO ROWS ── */
				.info-row {
					display: flex;
					align-items: flex-start;
					gap: 14px;
					text-align: left;
					padding: 14px 16px;
					border-radius: 10px;
					border: 1px solid #f3f4f6;
					background: #fafafa;
					margin-bottom: 10px;
				}
				.info-row:last-of-type { margin-bottom: 0; }
				.info-icon {
					font-size: 18px;
					margin-top: 2px;
					flex-shrink: 0;
				}
				.info-text-label {
					font-size: 12px;
					font-weight: 600;
					color: #374151;
					margin-bottom: 2px;
					letter-spacing: 0.2px;
				}
				.info-text-desc {
					font-size: 12px;
					color: #9ca3af;
					line-height: 1.5;
				}

				/* ── BUTTON ── */
				.btn-wrap {
					margin-top: 28px;
					animation: fadeUp 0.6s 0.45s cubic-bezier(.22,1,.36,1) both;
				}
				.btn {
					display: inline-block;
					padding: 13px 36px;
					background: #16a34a;
					color: #ffffff;
					text-decoration: none;
					border-radius: 8px;
					font-size: 14px;
					font-weight: 600;
					letter-spacing: 0.3px;
					box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
					transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
				}
				.btn:hover {
					background: #15803d;
					transform: translateY(-1px);
					box-shadow: 0 6px 20px rgba(22, 163, 74, 0.38);
				}
				.btn-note {
					font-size: 11px;
					color: #4E8D9C;
					margin-top: 10px;
				}

				/* ── FOOTER ── */
				.footer {
					border-top: 1.5px solid #f3f4f6;
					padding: 20px 32px;
					text-align: center;
					background: #fafafa;
					animation: fadeUp 0.6s 0.55s cubic-bezier(.22,1,.36,1) both;
				}
				.footer-text {
					font-size: 11px;
					color: #9ca3af;
					line-height: 1.7;
				}
				.footer-text a {
					color: blue;
					text-decoration: none;
					font-weight: 500;
				}
			</style>
		</head>
		<body>
		<div class="wrapper">
			<div class="card">

				<!-- Header: logo alone on its row, company name alone on its row -->
				<div class="header">
					<div class="logo-row">
						<img src="https://res.cloudinary.com/drkszk2ww/image/upload/v1774341142/pg-logo-Photoroom_lcafvr.png" alt="PG-Group Logo" />
					</div>
					<div class="company-row">
						<!--<div class="company-name">PG<span> Group</span></div>-->
						<div class="company-sub">Field Failure Report Platform</div>
					</div>
				</div>

				<!-- Badge -->
					<div class="divider" ></div>

				<!-- Body -->
				<div class="body">
					<div class="welcome-tag">Welcome Aboard</div>
					<!--<h3 class="title">Your account is approved</h3>-->
					<p class="desc">
						Hi <strong>${email}</strong>, your account has been approved.
						You're all set to access the platform.
					</p>

					<div class="divider"></div>

					<div class="info-row">
						<span class="info-icon">📋</span>
						<div>
							<div class="info-text-label">Field Failure Reports</div>
							<div class="info-text-desc">Submit and track field failure reports directly from your dashboard.</div>
						</div>
					</div>
					<div class="info-row">
						<span class="info-icon">🔐</span>
						<div>
							<div class="info-text-label">Secure Account Access</div>
							<div class="info-text-desc">Your credentials are secured. Log in anytime to manage your profile.</div>
						</div>
					</div>

					<div class="btn-wrap">
						<a href="${url}" class="btn">Access Your Account</a>
						<p class="btn-note">Click above to open the platform</p>
					</div>
				</div>

				<!-- Footer -->
				<div class="footer">
					<p class="footer-text">
						Questions? Reach us at <a href="mailto:support@pgel.in">support@pg-group.com</a><br/>
						This email was sent to ${email}. If this wasn't you, please ignore it.<br/>
						© ${new Date().getFullYear()} PG-Group. All rights reserved.
					</p>
				</div>

			</div>
		</div>
		</body>
		</html>
	`;
};