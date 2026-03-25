// routes/production.routes.js
import express from "express";
import {
  createProduction,
  listProduction,
  updateProduction,
  deleteProduction,
  getProductionStats,
  getProductionByCustomer,
  getMonthlyProductionTrend,
} from "../controlers/Production.controller.js";
import { isAuthenticated } from "../middleware/Authentication/isAuthenticated.js";
const router = express.Router();

// All production routes require auth
router.use(isAuthenticated);

// ── Read (all authenticated users) ──
router.get("/list",           listProduction);
router.get("/stats",          getProductionStats);
router.get("/by-customer",    getProductionByCustomer);
router.get("/monthly-trend",  getMonthlyProductionTrend);

// ── Write (admin only) ──
router.post("/create",   createProduction);
router.post("/update",  updateProduction);
router.post("/delete",  deleteProduction);

export default router;

/* 
  ── HOW TO REGISTER IN YOUR MAIN APP ──
  
  In app.js / server.js, add:
  
  import productionRouter from "./routes/production.routes.js";
  app.use("/api/production", productionRouter);
  
  This gives you these endpoints:
    GET  /api/production/list
    GET  /api/production/stats
    GET  /api/production/by-customer
    GET  /api/production/monthly-trend
    POST /api/production/create
    POST /api/production/update
    POST /api/production/delete
*/