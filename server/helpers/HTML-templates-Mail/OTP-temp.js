export const otpEmailTemplate = ({ otp }) => {
	return `
		<div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
			<div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
				
				<!-- Logo -->
				<div style="text-align: center; padding: 20px; background-color: #0d6efd;">
					<img src="https://yourdomain.com/logo.png" alt="Company Logo" style="max-height: 50px;" />
				</div>

				<!-- Body -->
				<div style="padding: 30px; text-align: center;">
					<h2>Your OTP Code</h2>
					<p>Use the OTP below to complete your login:</p>

					<div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; color: #0d6efd;">
						${otp}
					</div>

					<p style="font-size: 14px; color: #888;">
						This OTP is valid for 5 minutes.
					</p>
				</div>

				<!-- Footer -->
				<div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
					If you didn’t request this, please ignore this email.
				</div>

			</div>
		</div>
	`;
};