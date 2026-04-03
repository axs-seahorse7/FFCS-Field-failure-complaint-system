// routes/complaint.routes.js
import express from "express";
import {
  getComplaints, createComplaint, updateComplaintStatus, deleteComplaint,
  getComplaintStats, getMonthlyTrend, getByCategory, getTopDefects,
  getBySupplier, getByPart, getByCustomer,
  getWeeklyTrend, getByStatus, getCategoryVsPart,
  getCustomerVsStatus, getCustomerVsCategory,
  getByDoa, getByCommodity, getCommodityVsCategory,
  getByReplacement, getByCreatedUser, getByUpdatedUser, getAging, getProductionStats,
} from "../controlers/complaint.controller.js";
import {isAuthenticated} from "../middleware/Authentication/isAuthenticated.js";
import multer from "multer";
import { bulkUploadComplaints } from "../controlers/bulkUploadComplaint.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();



const uploads = multer({ storage: multer.memoryStorage() });
router.post("/bulk-upload", uploads.single("file"), bulkUploadComplaints);


/* ── User ── */
router.get("/get-complaint",  isAuthenticated, getComplaints);
router.post("/create-complaint", upload.single("image"), isAuthenticated, createComplaint);

/* ── Admin analytics ── */
const A = isAuthenticated;
router.get("/complaints/stats",                isAuthenticated, getComplaintStats);
router.get("/complaints/monthly",              isAuthenticated, getMonthlyTrend);
router.get("/complaints/weekly",               isAuthenticated, getWeeklyTrend);
router.get("/complaints/by-status",            isAuthenticated, getByStatus);
router.get("/complaints/by-category",          isAuthenticated, getByCategory);
router.get("/complaints/top-defects",          isAuthenticated, getTopDefects);
router.get("/complaints/by-supplier",          isAuthenticated, getBySupplier);
router.get("/complaints/by-part",              isAuthenticated, getByPart);
router.get("/complaints/by-customer",          isAuthenticated, getByCustomer);
router.get("/complaints/category-vs-part",     isAuthenticated, getCategoryVsPart);
router.get("/complaints/customer-vs-status",   isAuthenticated, getCustomerVsStatus);
router.get("/complaints/customer-vs-category", isAuthenticated, getCustomerVsCategory);
router.get("/complaints/by-doa",               isAuthenticated, getByDoa);
router.get("/complaints/by-commodity",         isAuthenticated, getByCommodity);
router.get("/complaints/commodity-vs-category",isAuthenticated, getCommodityVsCategory);
router.get("/complaints/by-replacement",       isAuthenticated, getByReplacement);
router.get("/complaints/by-created-user",      isAuthenticated, getByCreatedUser);
router.get("/complaints/by-updated-user",      isAuthenticated, getByUpdatedUser);
router.get("/complaints/aging",                isAuthenticated, getAging);
router.get("/complaints/production-stats",     isAuthenticated, getProductionStats);

/* ── Admin CRUD ── */
router.post("/complaints/status", isAuthenticated, updateComplaintStatus);
router.post("/complaints/delete", isAuthenticated, deleteComplaint);

export default router;
