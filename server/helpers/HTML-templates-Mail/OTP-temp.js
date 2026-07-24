export const otpEmailTemplate = ({ otp }) => {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="color-scheme" content="light dark" />
			<meta name="supported-color-schemes" content="light dark" />
			<style>
				:root { color-scheme: light dark; supported-color-schemes: light dark; }

				body {
					margin: 0;
					padding: 0;
					background-color: light-dark(#f4f4f5, #0d0d0d);
				}
				.otp-wrapper {
					font-family: 'Segoe UI', Arial, sans-serif;
					padding: 32px 16px;
					background-color: light-dark(#f4f4f5, #0d0d0d);
				}
				.otp-card {
					max-width: 480px;
					margin: auto;
					background: light-dark(#ffffff, #1a1a1a);
					border-radius: 12px;
					overflow: hidden;
					border: 1px solid light-dark(#e5e7eb, #2e2e2e);
				}
				.otp-header {
					text-align: center;
					padding: 20px;
					background-color: light-dark(#f4f4f5, #0d0d0d);
					border-bottom: 1px solid light-dark(#e5e7eb, #2e2e2e);
				}
				.otp-logo-plate {
					display: inline-block;
					padding: 10px 18px;
					border-radius: 8px;
					background-color: #f4f4f5;
				}
				.otp-body {
					padding: 36px 32px;
					text-align: center;
				}
				.otp-title {
					margin: 0 0 8px;
					font-size: 20px;
					font-weight: 600;
					color: light-dark(#1a1a1a, #f4f4f5);
				}
				.otp-subtext {
					margin: 0 0 24px;
					font-size: 14px;
					color: light-dark(#6b7280, #a1a1aa);
				}
				.otp-code {
					display: inline-block;
					font-size: 34px;
					font-weight: 700;
					letter-spacing: 8px;
					padding: 14px 28px;
					margin: 0 0 20px;
					color: light-dark(#1a1a1a, #f4f4f5);
					background-color: light-dark(#f4f4f5, #262626);
					border-radius: 8px;
					border: 1px solid light-dark(#e5e7eb, #333333);
				}
				.otp-note {
					font-size: 13px;
					color: light-dark(#9ca3af, #8a8a8f);
					margin: 0;
				}
				.otp-footer {
					padding: 16px;
					text-align: center;
					font-size: 12px;
					color: light-dark(#9ca3af, #8a8a8f);
					background: light-dark(#fafafa, #141414);
					border-top: 1px solid light-dark(#e5e7eb, #2e2e2e);
				}

				@media (prefers-color-scheme: dark) {
					body, .otp-wrapper { background-color: #0d0d0d; }
					.otp-card { background: #1a1a1a; border-color: #2e2e2e; }
					.otp-header { background-color: #0d0d0d; border-color: #2e2e2e; }
					.otp-title { color: #f4f4f5; }
					.otp-subtext, .otp-note, .otp-footer { color: #8a8a8f; }
					.otp-code { color: #f4f4f5; background-color: #262626; border-color: #333333; }
					.otp-footer { background: #141414; border-color: #2e2e2e; }
				}
			</style>
		</head>
		<body>
			<div class="otp-wrapper">
				<div class="otp-card">

					<!-- Logo -->
					<div class="otp-header">
						<div class="otp-logo-plate">
							<img src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png" alt="PG Group" style="max-height: 42px; display: block;" />
						</div>
					</div>

					<!-- Body -->
					<div class="otp-body">
						<h2 class="otp-title">Verification Code</h2>
						<p class="otp-subtext">Use the code below to complete your login</p>

						<div class="otp-code">${otp}</div>

						<p class="otp-note">This code expires in 5 minutes. Do not share it with anyone.</p>
					</div>

					<!-- Footer -->
					<div class="otp-footer">
						If you didn't request this, you can safely ignore this email.
					</div>

				</div>
			</div>
		</body>
		</html>
	`;
};