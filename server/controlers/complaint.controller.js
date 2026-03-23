// controllers/complaint.controller.js
import Complaint from "../Database/models/Forms/complaint.model.js";
import mongoose from "mongoose";

/* ═══════════════════════════════════════════════════════
   HELPER — month label array
═══════════════════════════════════════════════════════ */
const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// Production volumes per customer (add to your DB or keep as config)
// PPM = (defects / produced) * 1_000_000
const PRODUCTION_VOLUMES = {
  GODREJ:    308699,
  MARQ:      191234,
  HAIER:     115920,
  AMSTRAD:    66916,
  ONIDA:      59407,
  CROMA:      59972,
  VOLTAS:     77519,
  "BLUE STAR": 141667,
  BPL:        50000,
  CMI:        40000,
  HYUNDAI:    35000,
  SANSUI:     30000,
};

/* ═══════════════════════════════════════════════════════
   GET /get-complaint
   Supports: search, status, customerName, defectCategory, defectDetails
   Returns paginated complaint list
═══════════════════════════════════════════════════════ */
export const getComplaints = async (req, res) => {
  try {
    const {
      search,
      status,
      customerName,
      defectCategory,
      defectDetails,
      defectivePart,
      page = 1,
      limit = 500,
    } = req.query;

    const query = {};

    if (status)         query.status = status;
    if (customerName)   query.customerName = customerName;
    if (defectCategory) query.defectCategory = defectCategory;
    if (defectDetails)  query.defectDetails = new RegExp(defectDetails, "i");
    if (defectivePart)  query.defectivePart = defectivePart;

    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [
        { complaintNo:    re },
        { customerName:   re },
        { modelName:      re },
        { defectDetails:  re },
        { defectivePart:  re },
        { defectCategory: re },
      ];
    }

    // Non-admins only see their own complaints
    if (req.user.role !== "admin") {
      query.createdBy = req.user._id;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      Complaint.find(query)
        .sort({ complaintDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Complaint.countDocuments(query),
    ]);

    return res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /create-complaint
═══════════════════════════════════════════════════════ */
export const createComplaint = async (req, res) => {
  try {
    // Block check is already done in verifyToken middleware
    const complaint = await Complaint.create({
      ...req.body,
      createdBy: req.user._id,
    });
    return res.status(201).json({ data: complaint });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /complaints/status
   Body: { id, status }
═══════════════════════════════════════════════════════ */
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ message: "id and status required" });

    const VALID = ["Open","Active","Pending","Resolved","Closed"];
    if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { status, updatedBy: req.user._id },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    return res.json({ data: complaint });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /complaints/delete
   Body: { id }
═══════════════════════════════════════════════════════ */
export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "id required" });

    const complaint = await Complaint.findByIdAndDelete(id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/stats
   KPI summary for dashboard
═══════════════════════════════════════════════════════ */
export const getComplaintStats = async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const cy2022Start = new Date("2022-01-01");
    const cy2022End   = new Date("2022-12-31T23:59:59.999Z");
    const cy2023Start = new Date("2023-01-01");
    const cy2023End   = new Date("2023-12-31T23:59:59.999Z");
    const cy2024Start = new Date("2024-01-01");
    const cy2024End   = new Date("2024-12-31T23:59:59.999Z");

    const [statusCounts, yearlyPpm] = await Promise.all([
      // Status breakdown
      Complaint.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // PPM per year (using total production volume sum across all customers)
      Complaint.aggregate([
        {
          $facet: {
            total:    [{ $count: "n" }],
            cy2022:   [{ $match: { complaintDate: { $gte: cy2022Start, $lte: cy2022End } } }, { $count: "n" }],
            cy2023:   [{ $match: { complaintDate: { $gte: cy2023Start, $lte: cy2023End } } }, { $count: "n" }],
            cy2024:   [{ $match: { complaintDate: { $gte: cy2024Start, $lte: cy2024End } } }, { $count: "n" }],
            last12m:  [{ $match: { complaintDate: { $gte: twelveMonthsAgo } } }, { $count: "n" }],
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          }
        }
      ]),
    ]);

    const f = yearlyPpm[0];
    const totalProduction = Object.values(PRODUCTION_VOLUMES).reduce((a, b) => a + b, 0);

    const total    = f.total[0]?.n || 0;
    const last12m  = f.last12m[0]?.n || 0;
    const cy2022n  = f.cy2022[0]?.n || 0;
    const cy2023n  = f.cy2023[0]?.n || 0;
    const cy2024n  = f.cy2024[0]?.n || 0;

    const statusMap = {};
    (f.byStatus || []).forEach(s => { statusMap[s._id] = s.count; });

    return res.json({
      data: {
        total,
        defects:   last12m,
        avgPpm:    totalProduction > 0 ? Math.round((last12m / totalProduction) * 1_000_000) : 0,
        open:      statusMap["Open"]     || 0,
        active:    statusMap["Active"]   || 0,
        pending:   statusMap["Pending"]  || 0,
        resolved:  statusMap["Resolved"] || 0,
        closed:    statusMap["Closed"]   || 0,
        ppm2022:   totalProduction > 0 ? Math.round((cy2022n / totalProduction) * 1_000_000) : 0,
        ppm2023:   totalProduction > 0 ? Math.round((cy2023n / totalProduction) * 1_000_000) : 0,
        ppm2024:   totalProduction > 0 ? Math.round((cy2024n / totalProduction) * 1_000_000) : 0,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/monthly
   12-month rolling defect + PPM trend
═══════════════════════════════════════════════════════ */
export const getMonthlyTrend = async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const totalProduction = Object.values(PRODUCTION_VOLUMES).reduce((a, b) => a + b, 0);
    const monthlyProduction = Math.round(totalProduction / 12); // avg monthly

    const raw = await Complaint.aggregate([
      { $match: { complaintDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id:   { year: { $year: "$complaintDate" }, month: { $month: "$complaintDate" } },
          count: { $sum: 1 },
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Build full 12-month array (fill gaps with 0)
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = raw.find(r => r._id.year === year && r._id.month === month);
      const defects = found?.count || 0;
      result.push({
        m: MONTH_LABELS[month - 1],
        defects,
        ppm: monthlyProduction > 0 ? Math.round((defects / monthlyProduction) * 1_000_000) : 0,
      });
    }

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-category
═══════════════════════════════════════════════════════ */
export const getByCategory = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: { _id: "$defectCategory", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = data.reduce((s, d) => s + d.count, 0);
    const result = data.map(d => ({
      ...d,
      pct: total > 0 ? +((d.count / total) * 100).toFixed(1) : 0,
    }));

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/top-defects
   Groups by defectDetails, returns top 20 sorted desc
═══════════════════════════════════════════════════════ */
export const getTopDefects = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const raw = await Complaint.aggregate([
      { $match: { defectDetails: { $exists: true, $ne: "" } } },
      { $group: { _id: "$defectDetails", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const total = await Complaint.countDocuments();
    const data = raw.map(d => ({
      ...d,
      name: d._id,
      pct: total > 0 ? +((d.count / total) * 100).toFixed(2) : 0,
    }));

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-supplier
   Groups by a supplier field.
   If your complaint schema doesn't have a supplier field,
   we map defectivePart → supplier using a lookup config.
═══════════════════════════════════════════════════════ */

// Map parts → supplier (extend as needed)
const PART_TO_SUPPLIER = {
  "ODU PCB":         "CVTE",
  "IDU PCB":         "CVTE",
  "DISPLAY PCB":     "Laxmi",
  "REMOTE":          "Laxmi",
  "IDU MOTOR":       "Welling",
  "ODU MOTOR":       "Welling",
  "SWING MOTOR":     "Welling",
  "COMPRESSOR":      "PG",
  "EVAPORATOR COIL": "PG",
  "CONDENSER COIL":  "PG",
};

export const getBySupplier = async (req, res) => {
  try {
    // If you have a supplier field directly on the document, use:
    // const data = await Complaint.aggregate([
    //   { $group: { _id: "$supplier", count: { $sum: 1 } } },
    //   { $sort: { count: -1 } }
    // ]);

    // Otherwise, group by defectivePart and map to supplier
    const raw = await Complaint.aggregate([
      { $match: { defectivePart: { $exists: true, $ne: "" } } },
      { $group: { _id: "$defectivePart", count: { $sum: 1 } } },
    ]);

    // Roll up by supplier
    const supplierMap = {};
    raw.forEach(({ _id: part, count }) => {
      const supplier = PART_TO_SUPPLIER[part] || "Other";
      supplierMap[supplier] = (supplierMap[supplier] || 0) + count;
    });

    const data = Object.entries(supplierMap)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-part
═══════════════════════════════════════════════════════ */
export const getByPart = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { defectivePart: { $exists: true, $ne: "" } } },
      { $group: { _id: "$defectivePart", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-customer
   Returns defect count + PPM per customer
═══════════════════════════════════════════════════════ */
export const getByCustomer = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $match: { customerName: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id:   "$customerName",
          count: { $sum: 1 },
        }
      },
      { $sort: { count: -1 } },
    ]);

    const data = raw.map(d => {
      const produced = PRODUCTION_VOLUMES[d._id] || 0;
      return {
        ...d,
        produced,
        ppm: produced > 0 ? Math.round((d.count / produced) * 1_000_000) : 0,
      };
    });

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/ppm-trend
   Monthly PPM + units shipped (12 months)
═══════════════════════════════════════════════════════ */

// Monthly units shipped — store in DB or keep as config
const MONTHLY_UNITS_SHIPPED = [9864,10157,10683,12082,12616,11612,12418,11892,11714,10101,8948,7148];

export const getPpmTrend = async (req, res) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const raw = await Complaint.aggregate([
      { $match: { complaintDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id:   { year: { $year: "$complaintDate" }, month: { $month: "$complaintDate" } },
          count: { $sum: 1 },
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;
      const idx   = 11 - i; // index 0-11 for units array
      const found = raw.find(r => r._id.year === year && r._id.month === month);
      const defects = found?.count || 0;
      const units   = MONTHLY_UNITS_SHIPPED[idx] || 0;
      result.push({
        m: MONTH_LABELS[month - 1],
        defects,
        units,
        ppm: units > 0 ? Math.round((defects / units) * 1_000_000) : 0,
      });
    }

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/daily — last 30 days daily counts
═══════════════════════════════════════════════════════ */
export const getDailyTrend = async (req, res) => {
  try {
    const from = new Date(); from.setDate(from.getDate() - 30); from.setHours(0,0,0,0);
    const raw = await Complaint.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { d: "$_id", count: 1, _id: 0 } }
    ]);
    return res.json({ data: raw });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-status
═══════════════════════════════════════════════════════ */
export const getByStatus = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/category-vs-part — stacked bar data
   Returns array: { _id: category, [part]: count, ... }
═══════════════════════════════════════════════════════ */
export const getCategoryVsPart = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $group: { _id: { cat: "$defectCategory", part: "$defectivePart" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { cat, part }, count }) => {
      if (!map[cat]) map[cat] = { _id: cat };
      map[cat][part] = (map[cat][part] || 0) + count;
    });
    return res.json({ data: Object.values(map).sort((a, b) => {
      const sa = Object.values(a).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
      const sb = Object.values(b).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
      return sb - sa;
    })});
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/customer-vs-status
═══════════════════════════════════════════════════════ */
export const getCustomerVsStatus = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $group: { _id: { cust: "$customerName", status: "$status" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { cust, status }, count }) => {
      if (!map[cust]) map[cust] = { _id: cust };
      map[cust][status] = (map[cust][status] || 0) + count;
    });
    return res.json({ data: Object.values(map) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/customer-vs-category
═══════════════════════════════════════════════════════ */
export const getCustomerVsCategory = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $group: { _id: { cust: "$customerName", cat: "$defectCategory" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { cust, cat }, count }) => {
      if (!map[cust]) map[cust] = { _id: cust };
      map[cust][cat] = (map[cust][cat] || 0) + count;
    });
    return res.json({ data: Object.values(map) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-doa
═══════════════════════════════════════════════════════ */
export const getByDoa = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { doa: { $exists: true, $ne: "" } } },
      { $group: { _id: "$doa", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-commodity
═══════════════════════════════════════════════════════ */
export const getByCommodity = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: { _id: "$commodity", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/commodity-vs-category
═══════════════════════════════════════════════════════ */
export const getCommodityVsCategory = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $group: { _id: { comm: "$commodity", cat: "$defectCategory" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { comm, cat }, count }) => {
      if (!map[comm]) map[comm] = { _id: comm };
      map[comm][cat] = (map[comm][cat] || 0) + count;
    });
    return res.json({ data: Object.values(map) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-replacement
═══════════════════════════════════════════════════════ */
export const getByReplacement = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { replacementCategory: { $exists: true, $ne: "" } } },
      { $group: { _id: "$replacementCategory", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-created-user — complaints per createdBy user
═══════════════════════════════════════════════════════ */
// import User from "../models/user.model.js";

export const getByCreatedUser = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 20 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { count: 1, email: { $arrayElemAt: ["$user.email", 0] } } }
    ]);
    return res.json({ data: raw.map(r => ({ ...r, email: r.email || "Unknown" })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-updated-user
═══════════════════════════════════════════════════════ */
export const getByUpdatedUser = async (req, res) => {
  try {
    const raw = await Complaint.aggregate([
      { $match: { updatedBy: { $exists: true, $ne: null } } },
      { $group: { _id: "$updatedBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 20 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { count: 1, email: { $arrayElemAt: ["$user.email", 0] } } }
    ]);
    return res.json({ data: raw.map(r => ({ ...r, email: r.email || "Unknown" })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/aging — open complaints grouped by age buckets
═══════════════════════════════════════════════════════ */
export const getAging = async (req, res) => {
  try {
    const now = new Date();
    const open = await Complaint.find({ status: { $in: ["Open", "Active", "Pending"] } }, { createdAt: 1 }).lean();
    const buckets = [
      { label: "0–2 days",   min: 0,  max: 2,   color: "#22c55e", count: 0 },
      { label: "3–7 days",   min: 3,  max: 7,   color: "#f59e0b", count: 0 },
      { label: "8–14 days",  min: 8,  max: 14,  color: "#f97316", count: 0 },
      { label: "15–30 days", min: 15, max: 30,  color: "#e53935", count: 0 },
      { label: "30+ days",   min: 31, max: 9999, color: "#7c3aed", count: 0 },
    ];
    open.forEach(c => {
      const days = Math.floor((now - new Date(c.createdAt)) / 86400000);
      const b = buckets.find(bk => days >= bk.min && days <= bk.max);
      if (b) b.count++;
    });
    return res.json({ data: buckets });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};
