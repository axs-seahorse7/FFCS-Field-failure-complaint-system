import User from "../Database/models/User-Models/user.models.js";
import Complaint from "../Database/models/Forms/complaint.model.js";
import { accountApprovedTemplate } from "../helpers/HTML-templates-Mail/AccountApprovedTemp.js";
import {sendEmail} from '../helpers/nodemailer/nodemailer.js'
import bcrypt from "bcryptjs";

/* ───────────────── Helpers ───────────────── */

const sanitize = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

const bad = (res, msg) => res.status(400).json({ success: false, message: msg });
const notFound = (res) => res.status(404).json({ success: false, message: "User not found" });

/* ═══════════════════════════════════════════════════════
   GET /users (kept OLD logic + improved structure)
═══════════════════════════════════════════════════════ */
export const getUsers = async (req, res) => {
  try {
    const { search, role, isBlocked, page = 1, limit = 200 } = req.query;

    const query = {};

    if (role) query.role = role;

    if (isBlocked !== undefined && isBlocked !== "") {
      query.isBlocked = isBlocked === "true";
    }

    if (search) {
      query.email = new RegExp(search, "i");
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find(query)
      .select("-password -otp -otpExpiresAt")
      .populate("roleId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Complaint count (kept from old)
    const userIds = users.map(u => u._id);

    const complaintCounts = await Complaint.aggregate([
      { $match: { createdBy: { $in: userIds } } },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    complaintCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    const data = users.map(u => ({
      ...u,
      complaintCount: countMap[u._id.toString()] || 0,
    }));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("[getUsers]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   BLOCK USER (merged validation)
═══════════════════════════════════════════════════════ */
export const blockUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return bad(res, "User ID is required");

    if (id === req.user.userId.toString()) {
      return bad(res, "You cannot block yourself");
    }

    const user = await User.findById(id);
    if (!user) return notFound(res);
    if (user.isBlocked) return bad(res, "User already blocked");

    user.isBlocked = true;
    user.blockedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "User blocked successfully",
      user: sanitize(user),
    });
  } catch (err) {
    console.error("[blockUser]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   UNBLOCK USER
═══════════════════════════════════════════════════════ */
export const unblockUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return bad(res, "User ID is required");

    const user = await User.findById(id);
    if (!user) return notFound(res);
    if (!user.isBlocked) return bad(res, "User is not blocked");

    user.isBlocked = false;
    user.blockedAt = undefined;
    await user.save();

    res.json({
      success: true,
      message: "User unblocked successfully",
      user: sanitize(user),
    });
  } catch (err) {
    console.error("[unblockUser]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   DELETE USER (kept old + improved)
═══════════════════════════════════════════════════════ */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return bad(res, "User ID is required");

    if (id === req.user.userId.toString()) {
      return bad(res, "You cannot delete yourself");
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return notFound(res);

    res.json({
      success: true,
      message: "User deleted successfully",
      deletedId: id,
    });
  } catch (err) {
    console.error("[deleteUser]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   CHANGE ROLE (NEW secure version replaces old)
═══════════════════════════════════════════════════════ */
export const changeRole = async (req, res) => {
  try {
    const { id, role, password } = req.body;

    if (!id) return bad(res, "User ID is required");
    if (!role) return bad(res, "Role is required");
    if (!password) return bad(res, "Admin password required");

    const VALID_ROLES = ["admin", "user"];
    if (!VALID_ROLES.includes(role)) {
      return bad(res, `Role must be one of: ${VALID_ROLES.join(", ")}`);
    }

    const admin = await User.findById(req.user.userId).select("+password");
    if (!admin) return res.status(401).json({ success: false, message: "Unauthorized" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ success: false, message: "Incorrect password" });

    const target = await User.findById(id);
    if (!target) return notFound(res);

    if(target.isSystemRole){
      return bad(res, "Cannot change role of system Administrator");
    }

    if (target.isBlocked) {
      return bad(res, "Cannot change role of blocked user");
    }

    if (target.role === role) {
      return bad(res, `User already has role "${role}"`);
    }

    target.role = role;
    await target.save();

    res.json({
      success: true,
      message: `Role updated to "${role}"`,
      user: sanitize(target),
    });
  } catch (err) {
    console.error("[changeRole]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   NEW FEATURE → CHANGE USER STATUS
═══════════════════════════════════════════════════════ */
export const changeUserStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id) return bad(res, "User ID is required");
    if (!status) return bad(res, "Status is required");

    const VALID_STATUSES = ["active", "pending", "suspended"];
    if (!VALID_STATUSES.includes(status)) {
      return bad(res, `Invalid status`);
    }

    const user = await User.findById(id);
    if (!user) return notFound(res);

    if (user.isBlocked) {
      return bad(res, "Cannot change status of blocked user");
    }

    if (user.status === status) {
      return bad(res, `User already "${status}"`);
    }

    user.status = status;
    await user.save();

    if(status === "active"){
      const html = accountApprovedTemplate({email: user.email})

      await sendEmail({
        to: user.email,
        subject: "Your account has been approved!",
        html
      })
   
  }

    res.json({
      success: true,
      message: `Status updated to "${status}"`,
      user: sanitize(user),
    });
  } catch (err) {
    console.error("[changeUserStatus]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};