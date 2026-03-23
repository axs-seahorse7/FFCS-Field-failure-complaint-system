// routes/actionPlan.routes.js
import express from "express";
import {
  getActionPlans,
  createActionPlan,
  updateActionPlan,
  deleteActionPlan,
} from "../controllers/actionPlan.controller.js";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/action-plans",         verifyToken, requireAdmin, getActionPlans);
router.post("/action-plans",        verifyToken, requireAdmin, createActionPlan);
router.put("/action-plans/:id",     verifyToken, requireAdmin, updateActionPlan);
router.post("/action-plans/delete", verifyToken, requireAdmin, deleteActionPlan);

export default router;
