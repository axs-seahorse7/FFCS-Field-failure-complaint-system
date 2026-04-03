import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

/* ─────────────────────────────────────────
   COMPLAINT SCHEMA — PG GROUP FFS
   Matches ComplaintForm.jsx field structure
───────────────────────────────────────── */
const complaintSchema = new Schema(
  {
    /* ── Auto / System fields ── */
    complaintNo: {
      type: String,
    },

    /* ── Section 1: Basic Info ── */
    complaintDate: {
      type: Date,
      required: [true, "Complaint date is required"],
      default: Date.now,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      enum: {
        values: [
          "GODREJ","HAIER","AMSTRAD","ONIDA","CMI","MARQ","CROMA","BPL",
          "HYUNDAI","SANSUI","VOLTAS","BLUE STAR","SAMSUNG","LG","WHIRLPOOL",
          "DAIKIN","HITACHI","PANASONIC","CARRIER","OTHER",
        ],
        message: "{VALUE} is not a valid customer",
      },
    },

    commodity: {
      type: String,
      enum: {
        values: ["IDU", "ODU", "WAC"],
        message: "{VALUE} is not a valid commodity",
      },
    },

    replacementCategory: {
      type: String,
      trim: true,
      default: "",
    },

    customerComplaintId: { type: String, trim: true },
    serialNo:            { type: String, trim: true },
    partNo:              { type: String, trim: true },
    partModel:           { type: String, trim: true },

    modelName: {
      type: String,
      trim: true,
    },

    purchaseDate: {
      type: Date,
      default: null,
    },

    doa: {
      type: String,
      enum: { values: ["DOA", "IW", "OW", "OOW", ""], message: "{VALUE} is not valid" },
      default: "",
    },

    /* ── Section 2: Defect Details ── */
    defectCategory: {
      type: String,
      required: [true, "Defect category is required"],
      enum: {
        values: [
          "ELEC PART DEFECTS",
          "PART BROKEN / DAMAGED / MISSING",
          "LEAK",
          "NOISE",
          "MISC DEFECT",
          "OTHER",                              // ← added to match form
        ],
        message: "{VALUE} is not a valid defect category",
      },
    },

    defectivePart: {
      type: String,
      required: [true, "Defective part is required"],
    },

    symptom: {
      type: String,
      trim: true,
      default: "",
    },

    defectDetails: {
      type: String,
      required: [true, "Defect details are required"],
      trim: true,
    },

    status: {
      type: String,
      enum: {
        values: ["Open", "Pending", "Resolved", "Closed"],  // ← added Closed
        message: "{VALUE} is not a valid status",
      },
      default: "Open",
    },

    resolvedDate: {
      type: Date,
      default: null,
    },

    /* ── Section 3: Manufacturing & Location ── */
    manufacturingPlant: {
      type: String,
      trim: true,
      enum: {
        values: ["PG Supa", "NGM Supa", "PG Bhiwadi", "NGM Bhiwadi", ""],
        message: "{VALUE} is not a valid manufacturing plant",
      },
      default: "",
    },

    manufacturingDate: {
      type: Date,
      default: null,
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    /* ── Section 4: Data Base & Evidence ── */
    dataBase: {
      type: String,
      trim: true,
      enum: {
        values: ["Evidence", "Verification", "Data", ""],
        message: "{VALUE} is not a valid dataBase value",
      },
      default: "",
    },

    evidenceFile: {
      type: String,     // stores file path / URL after upload
      default: "",
    },

    /* ── Additional Info ── */
    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    /* ── Audit fields ── */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
      default: null,
      ref: "User",
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    imageKey:{
      type: String,
      trim: true,
      default: "",
    }
    
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ─────────────────────────────────────────
   AUTO-GENERATE complaintNo
   Format: PG-YYYYMMDD-XXXXX (e.g. PG-20260322-00001)
───────────────────────────────────────── *///////////
complaintSchema.pre("save", async function () {
  if (!this.isNew || this.complaintNo) return;

  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay   = new Date(today.setHours(23, 59, 59, 999));

  const count = await this.constructor.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const seq = String(count + 1).padStart(5, "0");
  this.complaintNo = `PG-${datePart}-${seq}`;
});

/* ─────────────────────────────────────────
   AUTO-SET resolvedDate on status change
───────────────────────────────────────── */
complaintSchema.pre("save", async function () {
  if (this.isModified("status")) {
    if (["Resolved", "Closed"].includes(this.status) && !this.resolvedDate) {
      this.resolvedDate = new Date();
    }
    if (!["Resolved", "Closed"].includes(this.status)) {
      this.resolvedDate = null;
    }
  }
});

/* ─────────────────────────────────────────
   INDEXES
───────────────────────────────────────── */
complaintSchema.index({ complaintNo: 1 },{ unique: true });
complaintSchema.index({ customerName: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ complaintDate: -1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ defectCategory: 1, defectivePart: 1 });
complaintSchema.index({ manufacturingPlant: 1 });      // ← new
complaintSchema.index({ city: 1, state: 1 });          // ← new

/* ─────────────────────────────────────────
   VIRTUALS
───────────────────────────────────────── */
complaintSchema.virtual("complaintDateFormatted").get(function () {
  return this.complaintDate
    ? this.complaintDate.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "";
});

// Product aging in days (complaint date − purchase date)
complaintSchema.virtual("productAging").get(function () {
  if (!this.complaintDate || !this.purchaseDate) return null;
  const diff = this.complaintDate - this.purchaseDate;
  return diff >= 0 ? Math.floor(diff / 86400000) : null;
});

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;