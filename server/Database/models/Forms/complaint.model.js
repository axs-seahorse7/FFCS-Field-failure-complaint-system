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
      required: [true, "Commodity is required"],
      enum: {
        values: ["IDU", "ODU", "WAC"],
        message: "{VALUE} is not a valid commodity",
      },
    },

    replacementCategory: {
        type: String,
        trim: true,
        enum: ["Part", "Services", "Demonstration", "Unit" ],
        default: "",
      },

      customerComplaintId: { type: String, trim: true },
      serialNo: { type: String, trim: true },
      partNo: { type: String, trim: true },
      partModel: { type: String, trim: true },


    modelName: {
      type: String,
      required: [true, "Model name is required"],
      trim: true,
    },

    purchaseDate: {
      type: Date,
      default: null,
    },

    doa: {
      type: String,
      enum: { values: ["DOA", "IW", "OW", ""], message: "{VALUE} is not valid" },
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
        ],
        message: "{VALUE} is not a valid defect category",
      },
    },

    defectivePart: {
      type: String,
      required: [true, "Defective part is required"],
      enum: {
        values: [
          "ODU PCB","IDU PCB","DISPLAY PCB","REMOTE","IDU MOTOR","ODU MOTOR",
          "SWING MOTOR","COMPRESSOR","EVAPORATOR COIL","CONDENSER COIL",
          "EXPANSION VALVE","CAPILLARY","IDU CHASSIS","ODU CHASSIS","FAN BLADE",
          "DRAIN TRAY","INSTALLATION PLATE","H-LOUVER","V-LOUVER","GAS PIPE",
          "WIRE HARNESS","OTHER",
        ],
        message: "{VALUE} is not a valid part",
      },
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
        values: ["Open", "Active", "Pending", "Resolved", "Closed"],
        message: "{VALUE} is not a valid status",
      },
      default: "Open",
    },

    /* ── Audit fields ── */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId, // user email or userId
      trim: true,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId, // user email or userId
      trim: true,
      default: null,
      ref: "User",
    },
  },
  {
    timestamps: true,       // adds createdAt + updatedAt automatically
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─────────────────────────────────────────
   AUTO-GENERATE complaintNo
   Format: PG-YYYYMMDD-XXXXX (e.g. PG-20260322-00001)
───────────────────────────────────────── */
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
   INDEXES
───────────────────────────────────────── */
complaintSchema.index({ complaintNo: 1 }, { unique: true });
complaintSchema.index({ customerName: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ complaintDate: -1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ defectCategory: 1, defectivePart: 1 });

/* ─────────────────────────────────────────
   VIRTUALS
───────────────────────────────────────── */
// Human-readable formatted date
complaintSchema.virtual("complaintDateFormatted").get(function () {
  return this.complaintDate
    ? this.complaintDate.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "";
});

/* ─────────────────────────────────────────
   MODEL EXPORT
   Guard prevents recompilation in Next.js hot-reload / serverless
───────────────────────────────────────── */
const Complaint = models.Complaint || model("Complaint", complaintSchema);

export default Complaint;


/* ═══════════════════════════════════════
   USAGE EXAMPLES
   ═══════════════════════════════════════

   // CREATE
   import Complaint from "@/models/complaint.model.js";
   const complaint = await Complaint.create({ ...formData, createdBy: req.user.email });

   // READ ALL (paginated)
   const complaints = await Complaint.find({ status: "Open" })
     .sort({ createdAt: -1 })
     .limit(20)
     .skip(page * 20);

   // READ ONE
   const complaint = await Complaint.findById(id);

   // UPDATE
   const updated = await Complaint.findByIdAndUpdate(
     id,
     { ...formData, updatedBy: req.user.email },
     { new: true, runValidators: true }
   );

   // DELETE
   await Complaint.findByIdAndDelete(id);

   // FILTER by customer + status
   const results = await Complaint.find({ customerName: "SAMSUNG", status: "Active" });

═══════════════════════════════════════ */
