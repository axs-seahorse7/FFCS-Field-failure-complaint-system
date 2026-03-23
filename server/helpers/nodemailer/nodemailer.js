import nodemailer from "nodemailer";

const getMailerConfig = () => {
	const isProduction = process.env.NODE_ENV === "production";

	if (isProduction) {
		return {
			host: process.env.SMTP_HOST_PROD || process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT_PROD || process.env.SMTP_PORT || 587),
			secure: String(process.env.SMTP_SECURE_PROD || process.env.SMTP_SECURE || "false") === "true",
			auth: {
				user: process.env.SMTP_USER_PROD || process.env.SMTP_USER,
				pass: process.env.SMTP_PASS_PROD || process.env.SMTP_PASS,
			},
			from: process.env.SMTP_FROM_PROD || process.env.SMTP_FROM,
		};
	}

	return {
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: String(process.env.SMTP_SECURE || "false") === "true",
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
		from: process.env.SMTP_FROM,
	};
};

const createTransporter = () => {
	const config = getMailerConfig();

	if (!config.host || !config.auth.user || !config.auth.pass || !config.from) {
		throw new Error("SMTP configuration is incomplete. Please check your .env values.");
	}

	return nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: config.auth,
	});
};

export const sendOtpEmail = async ({ to, otp }) => {
	const transporter = createTransporter();
	const { from } = getMailerConfig();

	const mailOptions = {
		from,
		to,
		subject: "Your Login OTP is for Testing",
		html: `
			<div style="font-family: Arial, sans-serif; line-height: 1.5;">
				<h2>Login Verification</h2>
				<p>Please verify your login by entering the OTP, this is for testing purposes only.</p>

				<p>Your OTP is:</p>
				<p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
				<p>This OTP is valid for 5 minutes.</p>
			</div>
		`,
	};

	return transporter.sendMail(mailOptions);
};

export default createTransporter;
