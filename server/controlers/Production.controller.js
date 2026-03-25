// controllers/production.controller.js
import Production from "../Database/models/Production/productions.model.js";

/* ═══════════════════════════════════════════════════════
   POST /production/create
   Body: { customer, commodity, month, production, fieldComplaint, warrantyComplaint }
═══════════════════════════════════════════════════════ */
export const createProduction = async (req, res) => {
  try {
    const { customer, commodity, month, production, fieldComplaint, warrantyComplaint } = req.body;

    if (!customer || !commodity || !month || production == null) {
      return res.status(400).json({ message: "customer, commodity, month, and production are required." });
    }

    // Prevent duplicate: same customer + commodity + month
    const monthStart = new Date(month);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const exists = await Production.findOne({
      customer,
      commodity,
      month: { $gte: monthStart, $lt: monthEnd },
    });

    if (exists) {
      return res.status(409).json({
        message: `Entry already exists for ${customer} – ${commodity} in ${monthStart.toLocaleString("default", { month: "short", year: "numeric" })}. Use update instead.`,
      });
    }

    // Calculate cumulative production (all previous months for same customer+commodity)
    const previousTotal = await Production.aggregate([
      {
        $match: {
          customer,
          commodity,
          month: { $lt: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$production" } } },
    ]);
    const prevSum = previousTotal[0]?.total || 0;

    const record = await Production.create({
      customer,
      commodity,
      month:             monthStart,
      production:        Number(production),
      fieldComplaint:    Number(fieldComplaint    || 0),
      warrantyComplaint: Number(warrantyComplaint || 0),
      cumulativeProduction: prevSum + Number(production),
    });

    return res.status(201).json({ data: record });
  } catch (err) {
    console.log("Error in createProduction:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /production/list
   Query: customer, commodity, from, to
═══════════════════════════════════════════════════════ */
export const listProduction = async (req, res) => {
  try {
    const { customer, commodity, from, to } = req.query;
    const query = {};

    if (customer)  query.customer  = customer;
    if (commodity) query.commodity = commodity;
    if (from || to) {
      query.month = {};
      if (from) query.month.$gte = new Date(from);
      if (to)   query.month.$lte = new Date(to);
    }

    const data = await Production.find(query).sort({ month: -1, customer: 1 }).lean();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /production/update
   Body: { id, production?, fieldComplaint?, warrantyComplaint? }
   NOTE: warrantyPPM is recalculated via pre-save hook
═══════════════════════════════════════════════════════ */
export const updateProduction = async (req, res) => {
  try {
    const { id, production, fieldComplaint, warrantyComplaint } = req.body;

    if (!id) return res.status(400).json({ message: "id is required" });

    const record = await Production.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    if (production        != null) record.production        = Number(production);
    if (fieldComplaint    != null) record.fieldComplaint    = Number(fieldComplaint);
    if (warrantyComplaint != null) record.warrantyComplaint = Number(warrantyComplaint);

    await record.save(); // triggers pre-save to recalculate warrantyPPM

    return res.json({ data: record });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /production/delete
   Body: { id }
═══════════════════════════════════════════════════════ */
export const deleteProduction = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "id is required" });

    const record = await Production.findByIdAndDelete(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /production/stats
   Aggregated summary: total produced, total warranty complaints, avg PPM
   Optionally filter by: customer, commodity, year
═══════════════════════════════════════════════════════ */
export const getProductionStats = async (req, res) => {
  try {
    const { customer, commodity, year } = req.query;
    const match = {};

    if (customer)  match.customer  = customer;
    if (commodity) match.commodity = commodity;
    if (year) {
      match.month = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      };
    }

    const [agg] = await Production.aggregate([
      { $match: match },
      {
        $group: {
          _id:   null,
          total:             { $sum: "$production" },
          totalField:        { $sum: "$fieldComplaint" },
          totalWarranty:     { $sum: "$warrantyComplaint" },
          avgPpm:            { $avg: "$warrantyPPM" },
          count:             { $sum: 1 },
        },
      },
    ]);

    return res.json({
      data: {
        total:         agg?.total         || 0,
        totalField:    agg?.totalField     || 0,
        totalWarranty: agg?.totalWarranty  || 0,
        avgPpm:        agg?.avgPpm ? Math.round(agg.avgPpm) : 0,
        count:         agg?.count         || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /production/by-customer
   Returns total production + PPM per customer
═══════════════════════════════════════════════════════ */
export const getProductionByCustomer = async (req, res) => {
  try {
    const { commodity, year } = req.query;
    const match = {};
    if (commodity) match.commodity = commodity;
    if (year) {
      match.month = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      };
    }

    const data = await Production.aggregate([
      { $match: match },
      {
        $group: {
          _id:              "$customer",
          totalProduction:  { $sum: "$production" },
          totalWarranty:    { $sum: "$warrantyComplaint" },
          totalField:       { $sum: "$fieldComplaint" },
        },
      },
      {
        $addFields: {
          ppm: {
            $cond: [
              { $gt: ["$totalProduction", 0] },
              { $multiply: [{ $divide: ["$totalWarranty", "$totalProduction"] }, 1_000_000] },
              0,
            ],
          },
        },
      },
      { $sort: { totalProduction: -1 } },
    ]);

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /production/monthly-trend
   Month-by-month: total production + warranty PPM
═══════════════════════════════════════════════════════ */
export const getMonthlyProductionTrend = async (req, res) => {
  try {
    const { customer, commodity } = req.query;
    const match = {};
    if (customer)  match.customer  = customer;
    if (commodity) match.commodity = commodity;

    const data = await Production.aggregate([
      { $match: match },
      {
        $group: {
          _id:             { $dateToString: { format: "%Y-%m", date: "$month" } },
          totalProduction: { $sum: "$production" },
          totalWarranty:   { $sum: "$warrantyComplaint" },
          totalField:      { $sum: "$fieldComplaint" },
        },
      },
      {
        $addFields: {
          ppm: {
            $cond: [
              { $gt: ["$totalProduction", 0] },
              { $multiply: [{ $divide: ["$totalWarranty", "$totalProduction"] }, 1_000_000] },
              0,
            ],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({ data: data.map(d => ({ m: d._id, ...d })) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};