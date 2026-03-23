// middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../Database/models/User-Models/user.models.js";

/* ─────────────────────────────────────────
   verifyToken
   Reads JWT from Authorization header or cookie.
   Attaches req.user = { id, email, role }
───────────────────────────────────────── */
export const verifyToken = async (req, res, next) => {
  try {
    // Support both Bearer token and httpOnly cookie
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-otp -otpExpiresAt");

    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.isBlocked) return res.status(403).json({ message: "Account blocked" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/* ─────────────────────────────────────────
   requireAdmin
   Must be used AFTER verifyToken
───────────────────────────────────────── */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
