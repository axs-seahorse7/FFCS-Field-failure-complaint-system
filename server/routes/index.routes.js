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
        const userId = req.user.userId; 
        
        const newComplaint = new Complaint({
            createdBy: userId,
            ...req.body, 
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
    
    const user = await User.findById(rawUserId)
      .select("isSystemRole roleId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let permissions = [];

    if (!user.isSystemRole && user.roleId) {
      const role = await Role.findById(user.roleId).select("permissions");
      permissions = role?.permissions || [];
    }

    //  Access control
    const canManage = user.isSystemRole || permissions.includes("manage");

    //  Query params
    const { search, status, customerName, defectCategory, commodity, page = 1, limit = 50, from, to } = req.query;

    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 50));
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;

        /* ═══════════════════════════════════════════════════════
       FIX: `status` (the active tab) must ONLY narrow the table
       rows — never the pill counts. Previously the status filter
       was baked into `conditions`, and the pill counts then did
       { ...query, status: "Open" } etc on top of an already
       status-locked query — an impossible AND (status can't be
       both "Pending" and "Open"), so every pill except the active
       tab always returned 0.

       Now: `baseConditions` = everything except status (role,
       search, customer, date-range) → drives all 4 pill counts.
       `listConditions` = baseConditions + status (if a tab is
       active) → drives ONLY the table rows.
    ═══════════════════════════════════════════════════════ */
    const baseConditions = [];

    // Role-based restriction
    if (!canManage) {
      baseConditions.push({
        $or: [
          { createdBy: new mongoose.Types.ObjectId(rawUserId) },
          { status: "resolved" }
        ]
      });
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      baseConditions.push({
        $or: [
          {title: regex },
          {description: regex },
          {complaintNo: regex},
          {customerName: regex},
          {modelName: regex},
          {commodity: regex},
          {serialNo: regex},
          {manufacturingPlant: regex},
        ]
      });
    }

    if (customerName) {
      const regex = new RegExp(customerName, "i");
      baseConditions.push({ customerName: regex });
    }

    if (defectCategory) {
      baseConditions.push({ defectCategory });
    }

    if (commodity) {
      baseConditions.push({ commodity });
    }

    // Date range filter
    if (from && to) {
      baseConditions.push({
        complaintDate: {
          $gte: new Date(from),
          $lte: new Date(to)
        }
      });
    }

    // Table rows — base filters + the currently active status tab
    const listConditions = [...baseConditions];
    if (status) {
      listConditions.push({ status });
    }
    const listQuery = listConditions.length ? { $and: listConditions } : {};

    //  Execute queries
    const [complaints, total, totalOpen, totalPending, totalResolved] = await Promise.all([
        Complaint.find(listQuery)
          .populate("createdBy", "email")
          .sort({ status: 1, complaintDate: -1 })
          .skip(skip)
          .limit(safeLimit)
          .lean(),

        // Pills — base filters ONLY, never the status tab
        Complaint.countDocuments(baseConditions.length ? { $and: baseConditions } : {}),
        Complaint.countDocuments({ $and: [...baseConditions, { status: "Open" }] }),
        Complaint.countDocuments({ $and: [...baseConditions, { status: "Pending" }] }),
        Complaint.countDocuments({ $and: [...baseConditions, { status: "Resolved" }] }),
      ]);

    return res.status(200).json({
      success: true,
      complaints,
      total,
      totalOpen,
      totalPending,
      totalResolved,
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
      //  Admin / Manager → see all complaints
      query = {};
    } else {
      //  Normal user → restricted access
      query = {
        $or: [
          { createdBy: req.user.userId },
          { status: "resolved" }
        ]
      };
    }

    const complaints = await Complaint.find(query)
      .populate("createdBy", "email")
      .sort({ status: 1, complaintDate: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ complaints });

  } catch (error) {
    console.error("Error fetching complaints for access:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

});

router.get("/users", isAuthenticated, async (req, res) => {
    try {
        const users = await User.find({}).select("-password").populate("roleId", "name").lean();
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

        if (fieldComplaint !== undefined) {
            record.fieldComplaint = fieldComplaint;
        }

        if (warrantyComplaint !== undefined) {
            record.warrantyComplaint = warrantyComplaint;
        }

        await record.save();

        res.status(200).json({
            message: "Production updated (snapshot preserved)",
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
});


export default router;