import e from "express";
import User from "../Database/models/User-Models/user.models.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../helpers/nodemailer/nodemailer.js";
import { isAuthenticated } from "../middleware/Authentication/isAuthenticated.js";
import { otpEmailTemplate } from "../helpers/HTML-templates-Mail/OTP-temp.js";

const router = e.Router();

router.post("/login", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    try {
        let user = await User.findOne({ email });

        if(user && user.isBlocked) {
            return res.status(403).json({ message: "Your account is blocked. Please contact support." });
        }
        
        if (user) {
            user.otp = otp;
            user.otpExpiresAt = otpExpiresAt;
            await user.save();
        }
        else {
            user = new User({ 
            email, 
            role: "user", 
            otp, 
            otpExpiresAt 
            });

        await user.save();
        }
        const html = otpEmailTemplate({otp})

        await sendEmail({ 
            to: email,
            subject: "Your Login OTP for testing", 
            html  
        });

        return res.status(200).json({
            message: "OTP sent successfully",
            email,
        });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ message: "Internal server error" });
    }

});

router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({
            message: "Email and OTP are required",
            success: false
        });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // ✅ OTP validation
        if (user.otp !== otp || user.otpExpiresAt < new Date()) {
            return res.status(400).json({
                message: "Invalid or expired OTP",
                success: false
            });
        }

        // ✅ Clear OTP after verification
        user.otp = null;
        user.otpExpiresAt = null;

        // 🔥 CASE 1: ACTIVE USER → LOGIN
        if (user.status === "active") {

            const token = jwt.sign(
                { userId: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            await user.save();

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).json({
                message: "Login successful",
                success: true,
                token,
                role: user.role,
            });
        }

        // 🔥 CASE 2: FIRST TIME / NOT APPROVED → SET PENDING
        if (!user.status || user.status === "pending") {

            user.status = "pending";
            await user.save();

            return res.status(403).json({
                message: "Account pending admin approval",
                success: false
            });
        }

    } catch (error) {
        console.error("Error during OTP verification:", error.message);

        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
});

router.get("/me", isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
});


router.post("/logout", isAuthenticated, async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        });
        return res.status(200).json({
            message: "Logged out successfully",
            success: true,
        });
    } catch (error) {
        console.error("Error during logout:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
});

export default router;