import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "../Database/config/db.config.js";

import authRoutes from "../routes/auth.routes.js";
import indexroutes from "../routes/index.routes.js";
import complaitRoutes from "../routes/complaint.routes.js";
import userRoutes from "../routes/user.routes.js";
import productionRoutes from "../routes/production.routes.js";

const app = express();

await connectDB();

// ✅ CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://ffcs-field-failure-complaint-system.vercel.app",
  "https://ffcs-field-failure-complaint-system-ten.vercel.app",
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.includes(".vercel.app")) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));


// middlewares
app.use(express.json());
app.use(cookieParser());


// routes
app.get("/", (req, res) => res.send("API running 🚀"));

app.use("/api/auth", authRoutes);
app.use("/api", indexroutes);
app.use("/api", complaitRoutes);
app.use("/api", userRoutes);
app.use("/api/production", productionRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

export default app;
