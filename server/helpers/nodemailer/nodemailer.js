import nodemailer from "nodemailer";

const getMailerConfig = () => {
	const isProduction = process.env.NODE_ENV === "production";

	if (isProduction) {
		return {
			host: process.env.SMTP_HOST ||process.env.SMTP_HOST_PROD || "smtp.gmail.com",
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

export const sendEmail = async ({ to, subject, html }) => {
	const transporter = createTransporter();
	const { from } = getMailerConfig();
	

	const mailOptions = {
		from,
		to,
		subject,
		html
	};

	return transporter.sendMail(mailOptions);
};



export default createTransporter;
