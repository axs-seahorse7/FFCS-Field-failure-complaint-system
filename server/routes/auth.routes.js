import e from "express";
import User from "../Database/models/User-Models/user.models.js";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../helpers/nodemailer/nodemailer.js";
import { isAuthenticated } from "../middleware/Authentication/isAuthenticated.js";

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

        await sendOtpEmail({ to: email, otp });

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
        return res.status(400).json({ message: "Email and OTP are required" });
    }
    try {        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.otp !== otp || user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        const token = jwt.sign({
            userId: user._id, role: user.role 
                }, 
            process.env.JWT_SECRET, { 
            expiresIn: "1h" 
            }
        );

        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7* 24* 60* 60* 1000,
        });

        return res.status(200).json({
            message: "OTP verified successfully",
            success: true,
            token,
            role: user.role,
        });
    } catch (error) {
        console.error("Error during OTP verification:", error.message);
        return res.status(500).json({ message: error.message, success: false });
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
            sameSite: "strict",
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