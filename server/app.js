import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

//database and models
import connectDB from "./Database/config/db.config.js";
import dotenv from "dotenv";

//routes and helpers
import authRoutes from "./routes/auth.routes.js";
import indexroutes from "./routes/index.routes.js";
import createTransporter from "./helpers/nodemailer/nodemailer.js";
import User from "./Database/models/User-Models/user.models.js";
import complaitRoutes from "./routes/complaint.routes.js";
import userRoutes from "./routes/user.routes.js";





dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(
	cors({
		origin: process.env.CLIENT_URL || "http://localhost:5173",
		credentials: true,
	})
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const ensureAdminAccount = async () => {
	const adminEmail = process.env.ADMIN_EMAIL || "pe.pgtl2@pgel.in";

	const existingAdmin = await User.findOne({ email: adminEmail });
	if (existingAdmin) {
		if (existingAdmin.role !== "admin") {
			existingAdmin.role = "admin";
			await existingAdmin.save();
		}
		console.log(`Admin account ready: ${adminEmail}`);
		return;
	}

	await User.create({
		email: adminEmail,
		role: "admin",
		otp: "000000",
		otpExpiresAt: new Date(0),
		isBlocked: false,
	});

	console.log(`Admin account created: ${adminEmail}`);
};



app.use("/api/auth", authRoutes);
app.use("/api", indexroutes);
app.use("/api", complaitRoutes);
app.use("/api", userRoutes);


const startServer = async () => {
	try {
		await connectDB();
		createTransporter(); // Validate SMTP config at startup
		// await ensureAdminAccount();

		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error.message);
		process.exit(1);
	}
};

startServer();
