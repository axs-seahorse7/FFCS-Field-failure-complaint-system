// controllers/production.controller.js
import Production from "../Database/models/Production/productions.model.js";

/* ═══════════════════════════════════════════════════════
   POST /production/create
   Body: { customer, commodity, month, production, fieldComplaint, warrantyComplaint }
═══════════════════════════════════════════════════════ */
export const createProduction = async (req, res) => {
  try {
    const {
      customer,
      location,
      month,
      idu,
      odu,
      wac,
      fieldComplaint,
      warrantyComplaint
    } = req.body;

    if (!customer || !location || !month) {
      return res.status(400).json({
        message: "customer, location, and month are required."
      });
    }

    const rawDate = new Date(month);

      // Convert to PURE UTC month start
    const monthStart = new Date(Date.UTC(
      rawDate.getUTCFullYear(),
      rawDate.getUTCMonth(),
      1
    ));

    //  Your schema already has UNIQUE index → no need manual duplicate check
    const record = await Production.create({
      customer,
      location,
      month: monthStart,
      idu: Number(idu || 0),
      odu: Number(odu || 0),
      wac: Number(wac || 0),
      fieldComplaint: Number(fieldComplaint || 0),
      warrantyComplaint: Number(warrantyComplaint || 0),
    });

    return res.status(201).json({ data: record });

  } catch (err) {
    // Handle duplicate error (from unique index)
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Record already exists for this customer, location, and month."
      });
    }

    console.log("Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   GET /production/list
   Query: customer, commodity, from, to
═══════════════════════════════════════════════════════ */
export const listProduction = async (req, res) => {
  try {
    const { customer, location, year } = req.query;

    const data = await Production.aggregate([
      {
        $match: {
          ...(customer && { customer }),
          ...(location && { location }), // ✅ use location instead
        }
      },
      {
        $addFields: {
          year: { $year: { date: "$month", timezone: "UTC" } }
        }
      },
      {
        $match: {
          ...(year && { year: Number(year) })
        }
      },
      {
        $sort: { month: -1 }
      }
    ]);


      const query = {};
      if (customer) query.customer = customer;
      if (location) query.location = location
          if (year) {
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const end   = new Date(`${year}-12-31T23:59:59.999Z`);

        query.month = { $gte: start, $lte: end };
      }

      const datas = await Production.find(query).sort({ month: -1 });
      console.log("Queried production records:", datas);

    return res.json({ data });

  } catch (err) {
    console.log("Error:", err);
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
    const {
      id,
      idu,
      odu,
      wac,
      fieldComplaint,
      warrantyComplaint,
      location,
      customer,
      month
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    const record = await Production.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // ✅ Update ONLY raw inputs
    if (idu != null) record.idu = Number(idu);
    if (odu != null) record.odu = Number(odu);
    if (wac != null) record.wac = Number(wac);

    if (fieldComplaint != null)
      record.fieldComplaint = Number(fieldComplaint);

    if (warrantyComplaint != null)
      record.warrantyComplaint = Number(warrantyComplaint);

    // Optional updates
    if (location) record.location = location;
    if (customer) record.customer = customer;
    if (month) {
      const rawDate = new Date(month);

      // Convert to PURE UTC month start
      const m = new Date(Date.UTC(
        rawDate.getUTCFullYear(),
        rawDate.getUTCMonth(),
        1
      ));
      record.month = m;
    }

    // ✅ This triggers your pre-save hook
    await record.save();

    return res.json({ data: record });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Duplicate entry for this customer, location, and month."
      });
    }

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