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
import { isAuthenticated } from "../middleware/Authentication/isAuthenticated.js";

const router = express.Router();

// All user management routes require admin
router.get("/users",          isAuthenticated, getUsers);
router.post("/users/block",   isAuthenticated, blockUser);
router.post("/users/unblock", isAuthenticated, unblockUser);
router.post("/users/delete",  isAuthenticated, deleteUser);
router.post("/users/role",    isAuthenticated, changeRole);
router.post("/users/status",  isAuthenticated, changeUserStatus);

export default router;
