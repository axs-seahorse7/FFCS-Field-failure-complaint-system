// controllers/complaint.controller.js
import Complaint from "../Database/models/Forms/complaint.model.js";
import User from "../Database/models/User-Models/user.models.js";
import Production from "../Database/models/Production/productions.model.js";

/* ═══════════════════════════════════════════════════════
   HELPER — build date match from query params
   Supports: year (e.g. 2024), from + to (ISO strings)
   Priority: explicit from/to overrides year
═══════════════════════════════════════════════════════ */
function buildDateMatch(query) {
  const { year, from, to, customerName } = query;

  const match = {};

  if (from || to) {
    match.complaintDate = {};
    if (from) match.complaintDate.$gte = new Date(from);
    if (to)   match.complaintDate.$lte = new Date(to);
  } else if (year) {
    const y = Number(year);
    match.complaintDate = {
      $gte: new Date(`${y}-01-01T00:00:00.000Z`),
      $lte: new Date(`${y}-12-31T23:59:59.999Z`),
    };
  }

  // 🔥 KEY CHANGE: treat customerName as brand
  if (customerName) {
    match.brand = customerName;
  }

  return match;
}
/* ═══════════════════════════════════════════════════════
   HELPER — month label array
═══════════════════════════════════════════════════════ */
const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

const PRODUCTION_VOLUMES = {
  GODREJ:      308699,
  MARQ:        191234,
  HAIER:       115920,
  AMSTRAD:      66916,
  ONIDA:        59407,
  CROMA:        59972,
  VOLTAS:       77519,
  "BLUE STAR": 141667,
  BPL:          50000,
  CMI:          40000,
  HYUNDAI:      35000,
  SANSUI:       30000,
};

const MONTHLY_UNITS_SHIPPED = [9864,10157,10683,12082,12616,11612,12418,11892,11714,10101,8948,7148];

/* ═══════════════════════════════════════════════════════
   GET /get-complaint
═══════════════════════════════════════════════════════ */
export const getComplaints = async (req, res) => {
  try {
    const loggedInUser = req.user.userId;

    const complaints = await Complaint.find({ createdBy: loggedInUser }).sort({ createdAt: -1 });
    return res.json({ complaints });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /create-complaint
═══════════════════════════════════════════════════════ */
export const createComplaint = async (req, res) => {
  console.log("Creating complaint with data:", req.body);

  try {
    const complaint = await Complaint.create({
      ...req.body,
      createdBy: req.user.userId,
    });

    await User.findByIdAndUpdate(req.user.userId, {
      $inc: {
        "stats.totalComplaints": 1,
        "stats.pendingComplaints": 1,
      },
    });

    await Production.findOneAndUpdate({
          customer: complaint.customerName,
          commodity: complaint.commodity,
          month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        {
          $inc: { fieldComplaint: 1 }, // 🔥 THIS matches your schema
        },
        { upsert: true }
      );

    return res.status(200).json({ data: complaint, success: true, message: "Complaint created successfully" });

  } catch (err) {
    console.error("Error creating complaint:", err);
    return res.status(400).json({ message: err.message });
  }
};
/* ═══════════════════════════════════════════════════════
   POST /complaints/status
═══════════════════════════════════════════════════════ */
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ message: "id and status required" });

    const VALID = ["Open", "Active", "Pending", "Resolved", "Closed"];
    if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const prevStatus = complaint.status;
    complaint.status    = status;
    complaint.updatedBy = req.user.userId;
    complaint.updatedAt = new Date();
    await complaint.save();

    const creator = await User.findById(complaint.createdBy);
    if (creator) {
      creator.stats = creator.stats || { resolvedComplaints: 0, pendingComplaints: 0 };
      if (prevStatus !== "Resolved" && status === "Resolved") {
        creator.stats.resolvedComplaints += 1;
        creator.stats.pendingComplaints = Math.max(0, creator.stats.pendingComplaints - 1);
      }
      await creator.save();
    }

    return res.json({ data: complaint });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /complaints/delete
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
   KPI summary — respects year/date filter
═══════════════════════════════════════════════════════ */
export const getComplaintStats = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const totalProduction = Object.values(PRODUCTION_VOLUMES).reduce((a, b) => a + b, 0);

    // Determine the year being viewed (for avgDays label)
    const viewYear = req.query.year ? Number(req.query.year) : null;

    const [facetResult] = await Complaint.aggregate([
      { $match: dateMatch },
      {
        $facet: {
          total:    [{ $count: "n" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          avgDays:  [
            { $match: { status: { $in: ["Resolved", "Closed"] }, updatedAt: { $exists: true } } },
            {
              $project: {
                days: {
                  $divide: [
                    { $subtract: ["$updatedAt", "$complaintDate"] },
                    86400000
                  ]
                }
              }
            },
            { $group: { _id: null, avg: { $avg: "$days" } } }
          ],
        }
      }
    ]);

    const total   = facetResult.total[0]?.n || 0;
    const avgDays = Math.round(facetResult.avgDays[0]?.avg || 0);

    const statusMap = {};
    (facetResult.byStatus || []).forEach(s => { statusMap[s._id] = s.count; });

    return res.json({
      data: {
        total,
        avgDays,
        avgPpm:   totalProduction > 0 ? Math.round((total / totalProduction) * 1_000_000) : 0,
        open:     statusMap["Open"]     || 0,
        active:   statusMap["Active"]   || 0,
        pending:  statusMap["Pending"]  || 0,
        resolved: statusMap["Resolved"] || 0,
        closed:   statusMap["Closed"]   || 0,
        defects:  total,
        year:     viewYear,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/production-stats
   Returns total production volume (for KPI card)
   Also computes PPM for the selected year
═══════════════════════════════════════════════════════ */
export const getProductionStats = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);

    // 1. Get production data (dynamic)
    const productionData = await Production.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: null,
          totalProduction: { $sum: "$production" },
          totalWarranty: { $sum: "$warrantyComplaint" },
          totalField: { $sum: "$fieldComplaint" },
        },
      },
    ]);

    const totalProduction = productionData[0]?.totalProduction || 0;
    const totalComplaints =
      (productionData[0]?.totalWarranty || 0) +
      (productionData[0]?.totalField || 0);

    // 2. Calculate PPM
    const ppm =
      totalProduction > 0
        ? Math.round((totalComplaints / totalProduction) * 1_000_000)
        : 0;

    // 3. Customer-wise production
    const byCustomer = await Production.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$customer",
          units: { $sum: "$production" },
          complaints: {
            $sum: {
              $add: ["$warrantyComplaint", "$fieldComplaint"],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          units: 1,
          complaints: 1,
        },
      },
    ]);

    return res.json({
      data: {
        total: totalProduction,
        defects: totalComplaints,
        ppm,
        byCustomer,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
/* ═══════════════════════════════════════════════════════
   GET /complaints/monthly
   Shows all months of the selected year (or rolling 12m)
═══════════════════════════════════════════════════════ */
export const getMonthlyTrend = async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const totalProduction = Object.values(PRODUCTION_VOLUMES).reduce((a, b) => a + b, 0);
    const monthlyProduction = Math.round(totalProduction / 12);

    let startDate, endDate, monthCount;

    if (year) {
      // Show all 12 months of the selected year
      startDate  = new Date(`${year}-01-01T00:00:00.000Z`);
      endDate    = new Date(`${year}-12-31T23:59:59.999Z`);
      monthCount = 12;
    } else {
      // Rolling 12 months from today
      const now = new Date();
      endDate   = now;
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      monthCount = 12;
    }

    // Also respect explicit from/to if provided (overrides year)
    const { from, to } = req.query;
    if (from) startDate = new Date(from);
    if (to)   endDate   = new Date(to);

    const raw = await Complaint.aggregate([
      { $match: { complaintDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id:   { year: { $year: "$complaintDate" }, month: { $month: "$complaintDate" } },
          count: { $sum: 1 },
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Build month array for the range
    const result = [];
    const cursor = new Date(startDate);
    cursor.setDate(1);

    while (cursor <= endDate) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const found = raw.find(r => r._id.year === y && r._id.month === m);
      const defects = found?.count || 0;
      result.push({
        m: `${y}-${String(m).padStart(2, "0")}`,
        defects,
        ppm: monthlyProduction > 0 ? Math.round((defects / monthlyProduction) * 1_000_000) : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/daily — last 30 days (within selected year)
═══════════════════════════════════════════════════════ */
export const getDailyTrend = async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const now  = new Date();

    let from, to;

    if (year) {
      const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      to   = yearEnd < now ? yearEnd : now;

      from = new Date(to);
      from.setUTCDate(to.getUTCDate() - 29);

      const yearStart = new Date(Date.UTC(year, 0, 1));
      if (from < yearStart) from = yearStart;

    } else {
      to   = new Date();
      from = new Date();
      from.setUTCDate(to.getUTCDate() - 29);
    }

    // Override
    if (req.query.from) from = new Date(req.query.from);
    if (req.query.to)   to   = new Date(req.query.to);

    // ✅ Normalize BOTH
    from.setUTCHours(0, 0, 0, 0);
    to.setUTCHours(23, 59, 59, 999);

    const raw = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Kolkata" // ✅ FIX
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ✅ Convert to map (FAST)
    const map = {};
    raw.forEach(r => {
      map[r._id] = r.count;
    });

    const result = [];
    const cursor = new Date(from);

    while (cursor <= to) {
      const dateStr = cursor.toLocaleDateString("en-CA"); // YYYY-MM-DD
      result.push({
        d: dateStr,
        count: map[dateStr] || 0
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return res.json({ data: result });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-status
═══════════════════════════════════════════════════════ */
export const getByStatus = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);

    const data = await Complaint.aggregate([
      { $match: dateMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-customer
═══════════════════════════════════════════════════════ */
export const getByCustomer = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);

    // 1. Complaints grouped by customer
    const complaints = await Complaint.aggregate([
      {
        $match: {
          ...dateMatch,
          customerName: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$customerName",
          complaints: { $sum: 1 },
        },
      },
    ]);

    // 2. Production grouped by customer
    const production = await Production.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$customer",
          produced: { $sum: "$production" },
        },
      },
    ]);

    // 3. Convert production array → map for fast lookup
    const productionMap = {};
    production.forEach((p) => {
      productionMap[p._id] = p.produced;
    });

    // 4. Merge + calculate PPM
    const data = complaints.map((c) => {
      const produced = productionMap[c._id] || 0;

      return {
        name: c._id,
        complaints: c.complaints,
        produced,
        ppm:
          produced > 0
            ? Math.round((c.complaints / produced) * 1_000_000)
            : 0,
      };
    });

    // 5. Sort by complaints
    data.sort((a, b) => b.complaints - a.complaints);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-category
═══════════════════════════════════════════════════════ */
export const getByCategory = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const data = await Complaint.aggregate([
      { $match: dateMatch },
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
   GET /complaints/by-part
═══════════════════════════════════════════════════════ */
export const getByPart = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const data = await Complaint.aggregate([
      { $match: { ...dateMatch, defectivePart: { $exists: true, $ne: "" } } },
      { $group: { _id: "$defectivePart", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-doa
═══════════════════════════════════════════════════════ */
export const getByDoa = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const data = await Complaint.aggregate([
      { $match: { ...dateMatch, doa: { $exists: true, $ne: "" } } },
      { $group: { _id: "$doa", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-commodity
═══════════════════════════════════════════════════════ */
export const getByCommodity = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const data = await Complaint.aggregate([
      { $match: dateMatch },
      { $group: { _id: "$commodity", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/ppm-trend
═══════════════════════════════════════════════════════ */
export const getPpmTrend = async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;

    let startDate, endDate;
    if (year) {
      startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      endDate   = new Date(`${year}-12-31T23:59:59.999Z`);
    } else {
      const now = new Date();
      endDate   = now;
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    if (req.query.from) startDate = new Date(req.query.from);
    if (req.query.to)   endDate   = new Date(req.query.to);

    const raw = await Complaint.aggregate([
      { $match: { complaintDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id:   { year: { $year: "$complaintDate" }, month: { $month: "$complaintDate" } },
          count: { $sum: 1 },
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const result = [];
    const cursor = new Date(startDate);
    cursor.setDate(1);
    let idx = 0;

    while (cursor <= endDate) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const found   = raw.find(r => r._id.year === y && r._id.month === m);
      const defects = found?.count || 0;
      const units   = MONTHLY_UNITS_SHIPPED[idx % 12] || 0;
      result.push({
        m: `${y}-${String(m).padStart(2, "0")}`,
        defects,
        units,
        ppm: units > 0 ? Math.round((defects / units) * 1_000_000) : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      idx++;
    }

    return res.json({ data: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/aging
   Open complaints grouped by age buckets — filtered by year
═══════════════════════════════════════════════════════ */
export const getAging = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const now = new Date();

    const open = await Complaint.find(
      { ...dateMatch, status: { $in: ["Open", "Active", "Pending"] } },
      { createdAt: 1 }
    ).lean();

    const buckets = [
      { label: "0–2 days",   min: 0,  max: 2,    color: "#22c55e", count: 0 },
      { label: "3–7 days",   min: 3,  max: 7,    color: "#f59e0b", count: 0 },
      { label: "8–14 days",  min: 8,  max: 14,   color: "#f97316", count: 0 },
      { label: "15–30 days", min: 15, max: 30,   color: "#e53935", count: 0 },
      { label: "30+ days",   min: 31, max: 9999, color: "#7c3aed", count: 0 },
    ];

    open.forEach(c => {
      const days = Math.floor((now - new Date(c.createdAt)) / 86400000);
      const b = buckets.find(bk => days >= bk.min && days <= bk.max);
      if (b) b.count++;
    });

    return res.json({ data: buckets });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/top-defects
═══════════════════════════════════════════════════════ */
export const getTopDefects = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const limit = Number(req.query.limit) || 20;

    const raw = await Complaint.aggregate([
      { $match: { ...dateMatch, defectDetails: { $exists: true, $ne: "" } } },
      { $group: { _id: "$defectDetails", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const total = await Complaint.countDocuments(dateMatch);
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
═══════════════════════════════════════════════════════ */
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
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: { ...dateMatch, defectivePart: { $exists: true, $ne: "" } } },
      { $group: { _id: "$defectivePart", count: { $sum: 1 } } },
    ]);

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
   GET /complaints/category-vs-part
═══════════════════════════════════════════════════════ */
export const getCategoryVsPart = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: dateMatch },
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
  } catch (err) {
    return res.status(500).json({ message: err.message }); }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/customer-vs-status
═══════════════════════════════════════════════════════ */
export const getCustomerVsStatus = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: dateMatch },
      { $group: { _id: { cust: "$customerName", status: "$status" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { cust, status }, count }) => {
      if (!map[cust]) map[cust] = { _id: cust };
      map[cust][status] = (map[cust][status] || 0) + count;
    });
    return res.json({ data: Object.values(map) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/customer-vs-category
═══════════════════════════════════════════════════════ */
export const getCustomerVsCategory = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: dateMatch },
      { $group: { _id: { cust: "$customerName", cat: "$defectCategory" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { cust, cat }, count }) => {
      if (!map[cust]) map[cust] = { _id: cust };
      map[cust][cat] = (map[cust][cat] || 0) + count;
    });
    return res.json({ data: Object.values(map) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/commodity-vs-category
═══════════════════════════════════════════════════════ */
export const getCommodityVsCategory = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: dateMatch },
      { $group: { _id: { comm: "$commodity", cat: "$defectCategory" }, count: { $sum: 1 } } }
    ]);
    const map = {};
    raw.forEach(({ _id: { comm, cat }, count }) => {
      if (!map[comm]) map[comm] = { _id: comm };
      map[comm][cat] = (map[comm][cat] || 0) + count;
    });
    return res.json({ data: Object.values(map) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-replacement
═══════════════════════════════════════════════════════ */
export const getByReplacement = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const data = await Complaint.aggregate([
      { $match: { ...dateMatch, replacementCategory: { $exists: true, $ne: "" } } },
      { $group: { _id: "$replacementCategory", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-created-user
═══════════════════════════════════════════════════════ */
export const getByCreatedUser = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: dateMatch },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 20 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { count: 1, email: { $arrayElemAt: ["$user.email", 0] } } }
    ]);
    return res.json({ data: raw.map(r => ({ ...r, email: r.email || "Unknown" })) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /complaints/by-updated-user
═══════════════════════════════════════════════════════ */
export const getByUpdatedUser = async (req, res) => {
  try {
    const dateMatch = buildDateMatch(req.query);
    const raw = await Complaint.aggregate([
      { $match: { ...dateMatch, updatedBy: { $exists: true, $ne: null } } },
      { $group: { _id: "$updatedBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 20 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $project: { count: 1, email: { $arrayElemAt: ["$user.email", 0] } } }
    ]);
    return res.json({ data: raw.map(r => ({ ...r, email: r.email || "Unknown" })) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};