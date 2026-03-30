// routes/user.routes.js
import express from "express";
import {
  getUsers,
  blockUser,
  unblockUser,
  deleteUser,
  changeRole,
  changeUserStatus,

} from "../controlers/user.controller.js";
import  User from "../Database/models/User-Models/user.models.js";
import { isAuthenticated } from "../middleware/Authentication/isAuthenticated.js";

const router = express.Router();

// All user management routes require admin
router.get("/users",          isAuthenticated, getUsers);
router.post("/users/block",   isAuthenticated, blockUser);
router.post("/users/unblock", isAuthenticated, unblockUser);
router.post("/users/delete",  isAuthenticated, deleteUser);
router.post("/users/role",    isAuthenticated, changeRole);
router.post("/users/status",  isAuthenticated, changeUserStatus);

router.post("/user/assign-role", isAuthenticated, async (req, res) => {
  const { userId, roleId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }
    if(user.status !== "active"){
        return res.status(403).json({ message: "Cannot change role of inactive user", success: false });
    };
    
    if(user.isBlocked ){
        return res.status(403).json({ message: "Cannot change role of blocked user", success: false });
    };

    user.roleId = roleId;
    await user.save();
    return res.status(200).json({ message: "Role assigned successfully", success: true });
  } catch (error) {
    console.error("Error assigning role:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
});

export default router;
