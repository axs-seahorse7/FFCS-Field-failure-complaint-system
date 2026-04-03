// controllers/complaint.controller.js
import Complaint from "../Database/models/Forms/complaint.model.js";
import User from "../Database/models/User-Models/user.models.js";
import Production from "../Database/models/Production/productions.model.js";
import { uploadToS3 } from "../services/s3Service.js";

/* ═══════════════════════════════════════════════════════
   HELPER — build date match from query params
   Supports: year (e.g. 2024), from + to (ISO strings)
   Priority: explicit from/to overrides year
═══════════════════════════════════════════════════════ */
  function buildDateMatch(query) {
    const { from, to, customerName } = query; // ❌ removed year

    const match = {};

    if (from || to) {
      match.complaintDate = {};
      if (from) match.complaintDate.$gte = new Date(from);
      if (to)   match.complaintDate.$lte = new Date(to);
    }
    // removed year fallback entirely

    if (customerName) {
      match.customerName = customerName;
    }

    return match;
  }
/* ═══════════════════════════════════════════════════════
   HELPER — month label array
═══════════════════════════════════════════════════════ */
const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];


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
  try {
    let imageUrl = null;
    let imageKey = null;


    // 🔥 Upload to S3
    if (req.file) {
      const result = await uploadToS3(req.file);
      imageUrl = result.url;
      imageKey = result.key;
    }

    // remove unwanted field
    const { image, ...rest } = req.body;

    const complaint = await Complaint.create({
      ...rest,
      createdBy: req.user.userId,
      imageUrl,
      imageKey, // 👈 store this for deletion later
    });

    await User.findByIdAndUpdate(req.user.userId, {
      $inc: {
        "stats.totalComplaints": 1,
        "stats.pendingComplaints": 1,
      },
    });

    await Production.findOneAndUpdate(
      {
        customer: complaint.customerName,
        commodity: complaint.commodity,
        month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
      {
        $inc: { fieldComplaint: 1 },
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      data: complaint,
      message: "Complaint created successfully",
    });

  } catch (err) {
    console.error("Error creating complaint:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
/* ═══════════════════════════════════════════════════════
   POST /complaints/status
═══════════════════════════════════════════════════════ */
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id, status, remarks } = req.body;
    if (!id || !status) return res.status(400).json({ message: "id and status required" });

    const VALID = [ "Resolved",];
    if (!VALID.includes(status)) return res.status(400).json({ message: "You cannot update to this status" });

    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: "This complaint may have been deleted!" });

    const prevStatus = complaint.status;
    complaint.status    = status;
    complaint.remarks   = remarks || complaint.remarks;
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
    console.error("Error updating complaint status:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (complaint?.imageKey) {
    await deleteFromS3(complaint.imageKey);
  }

  await Complaint.findByIdAndDelete(req.params.id);

  res.json({ message: "Deleted successfully" });
};

/* ═══════════════════════════════════════════════════════
   POST /complaints/delete
═══════════════════════════════════════════════════════ */
// export const deleteComplaint = async (req, res) => {
//   try {
//     const { id } = req.body;
//     if (!id) return res.status(400).json({ message: "id required" });
//     const complaint = await Complaint.findByIdAndDelete(id);
//     if (!complaint) return res.status(404).json({ message: "This complaint may have been deleted!" });
//     return res.json({ message: "Deleted successfully" });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

/* ═══════════════════════════════════════════════════════
   GET /complaints/stats
   KPI summary — respects year/date filter
═══════════════════════════════════════════════════════ */
const getYearRange = (year) => {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
  };
};

const getKpiData = async (start, end) => {
  //  Complaint KPI
  const [stats] = await Complaint.aggregate([
    {
      $match: {
        complaintDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,

        total: { $sum: 1 },

        open: {
          $sum: { $cond: [{ $eq: ["$status", "Open"] }, 1, 0] }
        },

        active: {
          $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] }
        },

        pending: {
          $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
        },

        resolved: {
          $sum: {
            $cond: [
              { $in: ["$status", ["Resolved", "Closed"]] },
              1,
              0
            ]
          }
        },

        closed: {
          $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] }
        },

        totalResolutionDays: {
          $sum: {
            $cond: [
              { $in: ["$status", ["Resolved", "Closed"]] },
              {
                $divide: [
                  { $subtract: ["$resolvedDate", "$complaintDate"] },
                  86400000
                ]
              },
              0
            ]
          }
        },

        resolvedCountForAvg: {
          $sum: {
            $cond: [
              { $in: ["$status", ["Resolved", "Closed"]] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        open: 1,
        active: 1,
        pending: 1,
        resolved: 1,
        closed: 1,

        avgDays: {
          $cond: [
            { $gt: ["$resolvedCountForAvg", 0] },
            {
              $round: [
                {
                  $divide: [
                    "$totalResolutionDays",
                    "$resolvedCountForAvg"
                  ]
                },
                0
              ]
            },
            0
          ]
        }
      }
    }
  ]);

  // 🏭 Production KPI
  const [prod] = await Production.aggregate([
    {
      $match: {
        month: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        production: { $sum: "$production" }
      }
    }
  ]);

  const total = stats?.total || 0;
  const resolved = stats?.resolved || 0;
  const production = prod?.production || 0;

  return {
    total,
    open: stats?.open || 0,
    active: stats?.active || 0,
    pending: stats?.pending || 0,
    resolved,
    closed: stats?.closed || 0,
    backlog: total - resolved,
    avgDays: stats?.avgDays || 0,
    production,
    avgPpm:
      production > 0
        ? Math.round((total / production) * 1_000_000)
        : 0
  };
};


export const getComplaintStats = async (req, res) => {
  try {
    const { from, to, year } = req.query;

    let currentStart, currentEnd, previousStart, previousEnd;

    if (from || to) {
      // ✅ Use explicit from/to range
      currentStart = from ? new Date(from) : new Date();
      currentEnd   = to   ? new Date(to)   : new Date();

      // Previous period = same duration, shifted back
      const duration = currentEnd - currentStart;
      previousStart = new Date(currentStart - duration);
      previousEnd   = new Date(currentEnd   - duration);

    } else {
      // ✅ Fallback to year-based range
      const y = year ? Number(year) : new Date().getUTCFullYear();
      const currentRange  = getYearRange(y);
      const previousRange = getYearRange(y - 1);
      currentStart  = currentRange.start;
      currentEnd    = currentRange.end;
      previousStart = previousRange.start;
      previousEnd   = previousRange.end;
    }

    const [current, previous] = await Promise.all([
      getKpiData(currentStart, currentEnd),
      getKpiData(previousStart, previousEnd),
    ]);

    return res.json({
      data: {
        year: year || currentStart.getUTCFullYear(),
        current,
        previous,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// export const getComplaintStats = async (req, res) => {
//   try {
//     const { from, to, year } = req.query;

//     // ✅ Date Range
//     let startDate, endDate;

//     if (year) {
//       startDate = new Date(`${year}-01-01`);
//       endDate   = new Date(`${year}-12-31`);
//     } else {
//       endDate   = to ? new Date(to) : new Date();
//       startDate = from
//         ? new Date(from)
//         : new Date(new Date().setMonth(endDate.getMonth() - 11));
//     }

//     // =========================
//     // 1. KPI (COMPLAINTS)
//     // =========================
//     const [kpi] = await Complaint.aggregate([
//       {
//         $match: {
//           complaintDate: { $gte: startDate, $lte: endDate }
//         }
//       },
//       {
//         $group: {
//           _id: null,

//           total: { $sum: 1 },

//           open: {
//             $sum: { $cond: [{ $eq: ["$status", "Open"] }, 1, 0] }
//           },

//           active: {
//             $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] }
//           },

//           pending: {
//             $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
//           },

//           resolved: {
//             $sum: {
//               $cond: [
//                 { $in: ["$status", RESOLVED_STATUS] },
//                 1,
//                 0
//               ]
//             }
//           },

//           totalResolutionDays: {
//             $sum: {
//               $cond: [
//                 { $in: ["$status", RESOLVED_STATUS] },
//                 {
//                   $divide: [
//                     { $subtract: ["$updatedAt", "$complaintDate"] },
//                     86400000
//                   ]
//                 },
//                 0
//               ]
//             }
//           },

//           resolvedCount: {
//             $sum: {
//               $cond: [
//                 { $in: ["$status", RESOLVED_STATUS] },
//                 1,
//                 0
//               ]
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           total: 1,
//           open: 1,
//           active: 1,
//           pending: 1,
//           resolved: 1,

//           avgDays: {
//             $cond: [
//               { $gt: ["$resolvedCount", 0] },
//               {
//                 $round: [
//                   { $divide: ["$totalResolutionDays", "$resolvedCount"] },
//                   0
//                 ]
//               },
//               0
//             ]
//           }
//         }
//       }
//     ]);

//     // =========================
//     // 2. PRODUCTION (REAL)
//     // =========================
//     const [prod] = await Production.aggregate([
//       {
//         $match: {
//           month: { $gte: startDate, $lte: endDate }
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalProduction: { $sum: "$production" }
//         }
//       }
//     ]);

//     const totalProduction = prod?.totalProduction || 0;

//     // =========================
//     // 3. MONTHLY TREND (REAL)
//     // =========================
//     const complaintsMonthly = await Complaint.aggregate([
//       {
//         $match: {
//           complaintDate: { $gte: startDate, $lte: endDate }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             y: { $year: "$complaintDate" },
//             m: { $month: "$complaintDate" }
//           },
//           defects: { $sum: 1 }
//         }
//       }
//     ]);

//     const productionMonthly = await Production.aggregate([
//       {
//         $match: {
//           month: { $gte: startDate, $lte: endDate }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             y: { $year: "$month" },
//             m: { $month: "$month" }
//           },
//           production: { $sum: "$production" }
//         }
//       }
//     ]);

//     // 🔥 Convert to maps (FAST)
//     const cMap = new Map(
//       complaintsMonthly.map(d => [`${d._id.y}-${d._id.m}`, d.defects])
//     );

//     const pMap = new Map(
//       productionMonthly.map(d => [`${d._id.y}-${d._id.m}`, d.production])
//     );

//     // Build 12 months trend
//     const trend = [];
//     const cursor = new Date(startDate);
//     cursor.setDate(1);

//     while (cursor <= endDate) {
//       const y = cursor.getFullYear();
//       const m = cursor.getMonth() + 1;

//       const key = `${y}-${m}`;

//       const defects = cMap.get(key) || 0;
//       const production = pMap.get(key) || 0;

//       trend.push({
//         m: `${y}-${String(m).padStart(2, "0")}`,
//         defects,
//         production,
//         ppm: production > 0
//           ? Math.round((defects / production) * 1_000_000)
//           : 0
//       });

//       cursor.setMonth(cursor.getMonth() + 1);
//     }

//     // =========================
//     // FINAL RESPONSE
//     // =========================
//     return res.json({
//       data: {
//         kpi: {
//           total: kpi?.total || 0,
//           open: kpi?.open || 0,
//           active: kpi?.active || 0,
//           pending: kpi?.pending || 0,
//           resolved: kpi?.resolved || 0,
//           avgDays: kpi?.avgDays || 0,
//           totalProduction,
//           avgPpm: totalProduction > 0
//             ? Math.round((kpi?.total || 0) / totalProduction * 1_000_000)
//             : 0
//         },
//         trend
//       }
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


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
    const { from, to } = req.query;

    // ---------- 1. Normalize Dates ----------
    const now = new Date();

    let startDate = from
      ? new Date(from)
      : new Date(new Date().setMonth(now.getMonth() - 11));

    let endDate = to ? new Date(to) : new Date();

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    // ---------- 2. Limit to 12 Months ----------
    const startMonth = new Date(startDate);
    startMonth.setUTCDate(1);

    const endMonth = new Date(endDate);
    endMonth.setUTCDate(1);

    const totalMonths =
      (endMonth.getUTCFullYear() - startMonth.getUTCFullYear()) * 12 +
      (endMonth.getUTCMonth() - startMonth.getUTCMonth()) + 1;

    // If range > 12 → shift start to last 12 months
    if (totalMonths > 12) {
      startMonth.setTime(endMonth.getTime());
      startMonth.setUTCMonth(endMonth.getUTCMonth() - 11);
    }

    // ---------- 3. Aggregations ----------
    const [complaints, production, resolvedData] = await Promise.all([
      Complaint.aggregate([
        {
          $match: {
            complaintDate: { $gte: startMonth, $lte: endMonth }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$complaintDate" },
              month: { $month: "$complaintDate" }
            },
            defects: { $sum: 1 }
          }
        }
      ]),

      Production.aggregate([
        {
          $match: {
            month: { $gte: startMonth, $lte: endMonth }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$month" },
              month: { $month: "$month" }
            },
            production: { $sum: "$production" }
          }
        }
      ]),

      Complaint.aggregate([
        {
          $match: {
            status: "Resolved",
            resolvedDate: { $gte: startMonth, $lte: endMonth }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$resolvedDate" },
              month: { $month: "$resolvedDate" }
            },
            resolved: { $sum: 1 }
          }
        }
      ])
    ]);

    // ---------- 4. Maps ----------
    const toMap = (arr, field) =>
      new Map(arr.map(d => [`${d._id.year}-${d._id.month}`, d[field]]));

    const cMap = toMap(complaints, "defects");
    const pMap = toMap(production, "production");
    const rMap = toMap(resolvedData, "resolved");

    // ---------- 5. Build Continuous Months ----------
    const result = [];
    const cursor = new Date(startMonth);

    while (cursor <= endMonth) {
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth() + 1;
      const key = `${y}-${m}`;

      const defects = cMap.get(key) || 0;
      const resolved = rMap.get(key) || 0;
      const productionQty = pMap.get(key) || 0;

      result.push({
        m: `${y}-${String(m).padStart(2, "0")}`,

        production: productionQty,
        complaints: defects,
        resolved,

        ppm:
          productionQty > 0
            ? Math.round((defects / productionQty) * 1_000_000)
            : 0,

        backlog: defects - resolved
      });

      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return res.json({ data: result });

  } catch (err) {
    console.error("Monthly trend error:", err);
    return res.status(500).json({ message: err.message });
  }
};;

/* ═══════════════════════════════════════════════════════
   GET /complaints/weekly — last 30 days (within selected year)
═══════════════════════════════════════════════════════ */
export const getWeeklyTrend = async (req, res) => {
  try {
    const now = new Date();

    // ✅ Current month start & end (UTC safe)
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // ✅ Aggregate complaints weekly
    const raw = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $addFields: {
          day: {
            $dayOfMonth: {
              date: "$createdAt",
              timezone: "Asia/Kolkata"
            }
          }
        }
      },
      {
        $addFields: {
          week: {
            $ceil: { $divide: ["$day", 7] } // 1–7 → week 1, etc.
          }
        }
      },
      {
        $group: {
          _id: "$week",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ✅ Map for fast lookup
    const map = {};
    raw.forEach(r => {
      map[r._id] = r.count;
    });

    // ✅ Always return 5 weeks (max possible in a month)
    const result = [];

    for (let week = 1; week <= 5; week++) {
      result.push({
        week: `W${week}`,
        count: map[week] || 0
      });
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