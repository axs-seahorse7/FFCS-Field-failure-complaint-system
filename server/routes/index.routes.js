import e from "express";
import {isAuthenticated} from "../middleware/Authentication/isAuthenticated.js";
import Complaint from "../Database/models/Forms/complaint.model.js";
import User from "../Database/models/User-Models/user.models.js";

const router = e.Router();

router.post("/save-complaint", isAuthenticated, (req, res) => {
    try {
        const userId = req.user.userId; // Extract user ID from the authenticated request
        
        const newComplaint = new Complaint({
            createdBy: userId,
            ...req.body, // Spread the rest of the complaint data from the request body
        });

        newComplaint.save()
        res.status(201).json({ message: "Complaint saved successfully", success: true });
        
    } catch (error) {
        console.error("Error saving complaint:", error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
    
});


router.get("/get-complaint", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { search, status } = req.query;

        // Base query
        let query = {};

        // Role-based filtering
        if (req.user.role !== "admin") {
            query.createdBy = userId;
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Search filter (example: searching in title/description)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        // Fetch complaints
        const complaints = await Complaint.find(query)
            .populate("createdBy", "email")
            .sort({ status: 1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            complaints
        });

    } catch (error) {
        console.error("Error fetching complaints:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/users", isAuthenticated, async (req, res) => {
    try {
        const users = await User.find({}).select("-password"); // Fetch all users, excluding their passwords
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;