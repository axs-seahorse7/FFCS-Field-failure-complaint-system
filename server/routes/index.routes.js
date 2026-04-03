import e from "express";
import {isAuthenticated} from "../middleware/Authentication/isAuthenticated.js";
import Role from "../Database/models/Role/role.model.js";
import Complaint from "../Database/models/Forms/complaint.model.js";
import User from "../Database/models/User-Models/user.models.js";
import Production from "../Database/models/Production/productions.model.js";
import mongoose from "mongoose";

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


router.get("/get-complaints", isAuthenticated, async (req, res) => {
  try {
    const rawUserId = req.user.userId;

    // 🔥 Fetch minimal user data
    const user = await User.findById(rawUserId)
      .select("isSystemRole roleId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔥 Get permissions ONLY if needed
    let permissions = [];

    if (!user.isSystemRole && user.roleId) {
      const role = await Role.findById(user.roleId).select("permissions");
      permissions = role?.permissions || [];
    }

    console.log(`User ${rawUserId} - isSystemRole: ${user.isSystemRole}, permissions: ${permissions}`);

    // 🔐 Access control
    const canManage = user.isSystemRole || permissions.includes("manage");
    // console.log(`User ${rawUserId} - canManage: ${canManage}, permissions: ${permissions}`);

    // 🔍 Query params
    const { search, status, page = 1, limit = 50 } = req.query;

    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 50));
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;

    // 🔥 Build query safely
    const conditions = [];

    // Role-based restriction
    if (!canManage) {
      conditions.push({
        $or: [
          { createdBy: new mongoose.Types.ObjectId(rawUserId) },
          { status: "resolved" }
        ]
      });
    }

    // Status filter
    if (status) {
      conditions.push({ status });
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      conditions.push({
        $or: [
          { title: regex },
          { description: regex }
        ]
      });
    }

    // Final query
    const query = conditions.length ? { $and: conditions } : {};

    // ⚡ Execute queries
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("createdBy", "email")
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      Complaint.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      complaints,
      total,
      page: safePage,
      limit: safeLimit,
    });

  } catch (error) {
    console.error("Error fetching complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/get-complaints/by-access", isAuthenticated, async (req, res) => {
  try {
    const userPermissions = req.user?.roleId?.permissions || [];

    let query = {};

    if (userPermissions.includes("manage")) {
      // 🔥 Admin / Manager → see all complaints
      query = {};
    } else {
      // 👤 Normal user → restricted access
      query = {
        $or: [
          { createdBy: req.user.userId },
          { status: "resolved" }
        ]
      };
    }

    const complaints = await Complaint.find(query)
      .populate("createdBy", "email")
      .sort({ status: 1, createdAt: -1 })
      .limit(50) // 🔥 cap results for performance
      .lean();

    return res.status(200).json({ complaints });

  } catch (error) {
    console.error("Error fetching complaints for access:", error);
    return res.status(500).json({ message: "Internal server error" });
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

router.post("/production", isAuthenticated, async (req, res) => {
    try {
        const { customer, commodity, month, production } = req.body;

        //  Check if record already exists
        const existing = await Production.findOne({ customer, commodity, month });

        if (existing) {
            return res.status(400).json({
                message: "Production already entered for this month",
                success: false
            });
        }

        const newProduction = new Production({
            customer,
            commodity,
            month,
            production
        });

        await newProduction.save();

        res.status(201).json({
            message: "Production snapshot created",
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});

router.put("/production/:id", isAuthenticated, async (req, res) => {
    try {
        const { fieldComplaint, warrantyComplaint } = req.body;

        const record = await Production.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                message: "Production record not found",
                success: false
            });
        }

        //  Only update complaints
        if (fieldComplaint !== undefined) {
            record.fieldComplaint = fieldComplaint;
        }

        if (warrantyComplaint !== undefined) {
            record.warrantyComplaint = warrantyComplaint;
        }

        await record.save();

        res.status(200).json({
            message: "Complaints updated (snapshot preserved)",
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});


export default router;