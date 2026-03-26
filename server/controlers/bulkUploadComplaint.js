import xlsx from "xlsx";
import Complaint from "../Database/models/Forms/complaint.model.js";

const normalize = (v) => String(v || "").toUpperCase().trim();

export const bulkUploadComplaints = async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: "" });

      const cleanedData = rawData.map((row) => {
        const newRow = {};
        for (let key in row) {
          const cleanKey = key.trim(); // 🔥 removes spaces like "Defects Details "
          newRow[cleanKey] = row[key];
        }
        return newRow;
      });


    const safeStr = (v) => String(v ?? "").trim();
      const safeUpper = (v) => safeStr(v).toUpperCase();

      const parseDate = (v) => {
          if (!v) return null;

          // ✅ If Excel serial number
          if (typeof v === "number") {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            return new Date(excelEpoch.getTime() + v * 86400000);
          }
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        };


      const mappedData = cleanedData.map((row) => ({
        complaintDate: parseDate(row["Complaint Date"]) || new Date(),

        customerName: safeUpper(row["Customer Name"]),
        commodity: safeUpper(row["COMODITY"]),
        replacementCategory: safeUpper(row["REPLACEMENT CATEGORY"]) || "",

        modelName: safeStr(row["Model Name"]) || "NEW MODEL",

        purchaseDate: parseDate(row["Purchase Date"]),

        doa: safeUpper(row["DOA"]) || "",

        defectCategory: safeUpper(row["Defect Category"]),
        defectivePart: safeUpper(row["Defective part"]),

        symptom: "",

        defectDetails: safeStr(row["Defects Details"]),

        status: "Open",
      }));

      const valid = [];
      const failed = [];

      for (const row of mappedData) {
        try {
          const doc = new Complaint(row);
          await doc.validate();
          valid.push(row);
        } catch (e) {
          failed.push({ row, error: e.message });
        }
      }

      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");

      let counter = await Complaint.countDocuments({
        createdAt: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59, 999)),
        },
      });

      const finalData = valid.map((row, i) => ({
        ...row,
        complaintNo: `PG-${datePart}-${String(counter + i + 1).padStart(5, "0")}`,
      }));

      await Complaint.insertMany(finalData);

      res.status(200).json({
        inserted: valid.length,
        failed: failed.length,
      });

    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ error: error.message });
    }
};