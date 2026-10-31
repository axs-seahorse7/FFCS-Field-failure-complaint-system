
import nodemailer from "nodemailer";

const getMailerConfig = () => {
    const config = {
        host: process.env.SMTP_HOST || "smtp.office365.com",
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM,
    };

    if (!config.user || !config.pass || !config.from) {
        throw new Error("SMTP configuration is incomplete.");
    }

    console.log("SMTP CONFIG:", {
        host: config.host,
        port: config.port,
        userAvailable: !!config.user,
        passwordAvailable: !!config.pass,
        fromAvailable: !!config.from,
    });

    return config;
};

const createTransporter = () => {
    const config = getMailerConfig();

    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false,
        requireTLS: true,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
};

export const sendEmail = async ({ to, subject, html }) => {
    const config = getMailerConfig();
    const transporter = createTransporter();

    return await transporter.sendMail({
        from: `PG FFR <${config.from}>`,
        to,
        subject,
        html,
    });
};

export default createTransporter;
