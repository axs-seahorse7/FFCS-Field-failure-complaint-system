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
        newRow[key.trim()] = row[key];
      }
      return newRow;
    });

    const safeStr = (v) => String(v ?? "").trim();
    const safeUpper = (v) => safeStr(v).toUpperCase();
    const toNum = (v) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    const parseDate = (v) => {
      if (!v) return null;
      if (typeof v === "number") {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(excelEpoch.getTime() + v * 86400000);
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };

    const patterns = [
      { regex: /ngm\s*supa/i, label: "NGM Supa" },
      { regex: /ngm\s*bhiwadi/i, label: "NGM Bhiwadi" },
      { regex: /bhiwadi|bhd/i, label: "PG Bhiwadi" },
      { regex: /supa/i, label: "PG Supa" },
    ];

    const normalizePlant = (v) => {
      const s = safeStr(v);
      for (const { regex, label } of patterns) {
        if (regex.test(s)) return label;
      }
      return "";
    };

    const normalizeDataBase = (v) => {
      const s = safeStr(v).toLowerCase();
      if (s.includes("evidence")) return "Evidence";
      if (s.includes("verification")) return "Verification";
      if (s.includes("data")) return "Data";
      return "";
    };

    const mappedData = cleanedData.map((row) => ({
      complaintDate: parseDate(row["Complaint Date"]) || new Date(),
      customerName: safeUpper(row["Customer Name"]),
      commodity: safeUpper(row["COMODITY"]),
      replacementCategory: safeUpper(row["REPLACEMENT CATEGORY"]) || "",
      modelName: safeStr(row["Model Name"]) || "NEW MODEL",
      tonage: safeStr(row["TONAGE"]),
      serialNo: safeStr(row["Serial No"]),
      manufacturingPlant: normalizePlant(row["Mfg. Plant (Supa / Bhiwadi)"]) ,
      manufacturingDate: parseDate(row["Month & Year of MFG"]),
      city: safeStr(row["Reported Location"]),
      doa: safeUpper(row["DOA"]) || "",
      dataBase: normalizeDataBase(row["Data Base (evidence / verification / data base)"]),
      defectCategory: safeUpper(row["Defect Category"]),
      defectivePart: safeUpper(row["Defective part"]),
      defectDetails: safeStr(row["Defects Details"]),
      partSupplier: safeStr(row["Part supplier"]),
      qty: toNum(row["Qty"]),
      partModel: safeStr(row["Part Model"]),
      defReceived: safeStr(row["Def received"]),
      replacementFromSupplier: toNum(row["Replacement from supplier"]),
      replacementPending: toNum(row["Replacement Pending"]),
      status: "Open",
    }));

    const valid = [];
    const failed = [];

    for (let i = 0; i < mappedData.length; i++) {
      try {
        const doc = new Complaint(mappedData[i]);
        await doc.validate();
        valid.push(mappedData[i]);
      } catch (e) {
        failed.push({ ...cleanedData[i], _errorReason: e.message });
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

    if (failed.length > 0) {
      const failedSheet = xlsx.utils.json_to_sheet(failed);
      const failedWorkbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(failedWorkbook, failedSheet, "Failed Rows");
      const buffer = xlsx.write(failedWorkbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="failed_rows_${datePart}.xlsx"`);
      res.setHeader("X-Inserted-Count", String(valid.length));
      res.setHeader("X-Failed-Count", String(failed.length));
      res.setHeader("Access-Control-Expose-Headers", "X-Inserted-Count, X-Failed-Count");

      return res.status(207).send(buffer);
    }

    res.status(200).json({ inserted: valid.length, failed: 0 });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ error: error.message });
  }
};