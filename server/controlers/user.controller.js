// controllers/user.controller.js
import User from "../Database/models/User-Models/user.models.js";
import Complaint from "../Database/models/Forms/complaint.model.js";

/* ═══════════════════════════════════════════════════════
   GET /users
   Query params: search, role, isBlocked, page, limit
═══════════════════════════════════════════════════════ */
export const getUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      isBlocked,
      page  = 1,
      limit = 200,
    } = req.query;

    const query = {};

    if (role)       query.role = role;

    // isBlocked can come as "true"/"false" string from query params
    if (isBlocked !== undefined && isBlocked !== "") {
      query.isBlocked = isBlocked === "true";
    }

    if (search) {
      query.email = new RegExp(search, "i");
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Get users
    const users = await User.find(query)
      .select("-otp -otpExpiresAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Attach complaint count for each user
    const userIds = users.map(u => u._id);
    const complaintCounts = await Complaint.aggregate([
      { $match: { createdBy: { $in: userIds } } },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    complaintCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const data = users.map(u => ({
      ...u,
      complaintCount: countMap[u._id.toString()] || 0,
    }));

    const total = await User.countDocuments(query);

    return res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /users/block
   Body: { id }
═══════════════════════════════════════════════════════ */
export const blockUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "User id required" });

    // Prevent admins from blocking themselves
    if (id === req.user.userId.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked: true, blockedAt: new Date() },
      { new: true }
    ).select("-otp -otpExpiresAt");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ data: user, message: "User blocked successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /users/unblock
   Body: { id }
═══════════════════════════════════════════════════════ */
export const unblockUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "User id required" });

    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked: false, $unset: { blockedAt: "" } },
      { new: true }
    ).select("-otp -otpExpiresAt");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ data: user, message: "User unblocked successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /users/delete
   Body: { id }
   Also deletes all complaints created by that user (optional, configure as needed)
═══════════════════════════════════════════════════════ */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "User id required" });

    if (id === req.user.userId.toString()) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Optionally: delete their complaints too
    // await Complaint.deleteMany({ createdBy: id });

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /users/role
   Body: { id, role }
═══════════════════════════════════════════════════════ */
export const changeRole = async (req, res) => {
  try {
    const { id, role } = req.body;
    if (!id || !role) return res.status(400).json({ message: "id and role required" });

    const VALID_ROLES = ["admin", "user"];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${VALID_ROLES.join(", ")}` });
    }

    if (id === req.user.userId.toString() && role !== "admin") {
      return res.status(400).json({ message: "Cannot demote your own admin account" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-otp -otpExpiresAt");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ data: user, message: `Role updated to "${role}"` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
