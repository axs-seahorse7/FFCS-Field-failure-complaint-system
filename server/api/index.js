import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import connectDB from "../Database/config/db.config.js";

// routes
import authRoutes from "../routes/auth.routes.js";
import indexroutes from "../routes/index.routes.js";
import complaitRoutes from "../routes/complaint.routes.js";
import userRoutes from "../routes/user.routes.js";
import productionRoutes from "../routes/production.routes.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// ✅ CORS
app.use(
  cors({
    origin: isProduction
      ? process.env.CLIENT_URL
      : "http://localhost:5173",
    credentials: true,
  })
);

// ✅ Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ⚠️ DB connection (cached)
let isConnected = false;

const connectDBOnce = async () => {
  if (isConnected) return;
  await connectDB();
  isConnected = true;
};

// ✅ Ensure DB before every request
app.use(async (req, res, next) => {
  try {
    await connectDBOnce();
    next();
  } catch (err) {
    console.error("DB ERROR:", err);
    return res.status(500).json({ message: "DB connection failed" });
  }
});

// ✅ Routes
app.get("/", (req, res) => {
  res.send("API running on Vercel 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api", indexroutes);
app.use("/api", complaitRoutes);
app.use("/api", userRoutes);
app.use("/api/production", productionRoutes);

// ❌ NO app.listen()

export default app;