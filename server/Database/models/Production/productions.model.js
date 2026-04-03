import mongoose from "mongoose";

const productionSchema = new mongoose.Schema(
  {
    // ── Identifiers ──────────────────────────────
    month: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      required: true,
      enum: ["Bhiwadi", "Supa"],
      trim: true,
    },

    customer: {
      type: String,
      required: true,
      trim: true,
    },

    commodity: {
      type: String,
      trim: true,
    },

    // ── Raw inputs (all optional — enter 0 if not applicable) ──
    idu: {
      type: Number,
      default: 0,
      min: 0,
    },

    odu: {
      type: Number,
      default: 0,
      min: 0,
    },

    wac: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Auto-calculated production ────────────────
    // Formula: (IDU + ODU) / 2 + WAC = Total Production
    production: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Complaints ───────────────────────────────
    fieldComplaint: {
      type: Number,
      default: 0,
      min: 0,
    },

    warrantyComplaint: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Auto-calculated complaint total ──────────
    // Formula: fieldComplaint + warrantyComplaint
    totalComplaint: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Auto-calculated PPM ──────────────────────
    // Formula: (warrantyComplaint / production) * 1,000,000
    warrantyPPM: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ─────────────────────────────────────────────────
   Helper — recalculate all derived fields
   from raw inputs (idu, odu, wac, complaints)
───────────────────────────────────────────────── */
function computeDerived(doc) {
  const idu = doc.idu ?? 0;
  const odu = doc.odu ?? 0;
  const wac = doc.wac ?? 0;
  const fc  = doc.fieldComplaint    ?? 0;
  const wc  = doc.warrantyComplaint ?? 0;

  const production    = Math.round(((idu + odu) / 2) + wac);
  const totalComplaint = fc + wc;
  const warrantyPPM   = production > 0 ? (wc / production) * 1e6 : 0;

  return { production, totalComplaint, warrantyPPM };
}

/* ── Pre-save hook ── */
productionSchema.pre("save", function () {
  const changed =
    this.isModified("idu") ||
    this.isModified("odu") ||
    this.isModified("wac") ||
    this.isModified("fieldComplaint") ||
    this.isModified("warrantyComplaint");

  if (changed) {
    const { production, totalComplaint, warrantyPPM } = computeDerived(this);
    this.production     = production;
    this.totalComplaint = totalComplaint;
    this.warrantyPPM    = warrantyPPM;
  }
});

/* ── Pre-update hook (findOneAndUpdate / updateOne) ── */
function applyUpdateHook() {
  const update = this.getUpdate()?.$set ?? this.getUpdate() ?? {};

  const hasChanged =
    "idu"               in update ||
    "odu"               in update ||
    "wac"               in update ||
    "fieldComplaint"    in update ||
    "warrantyComplaint" in update;

  if (hasChanged) {
    const idu = update.idu               ?? 0;
    const odu = update.odu               ?? 0;
    const wac = update.wac               ?? 0;
    const fc  = update.fieldComplaint    ?? 0;
    const wc  = update.warrantyComplaint ?? 0;

    const production     = Math.round(((idu + odu) / 2) + wac);
    const totalComplaint = fc + wc;
    const warrantyPPM    = production > 0 ? (wc / production) * 1e6 : 0;

    this.set({ production, totalComplaint, warrantyPPM });
  }
}

productionSchema.pre("findOneAndUpdate", applyUpdateHook);
productionSchema.pre("updateOne",        applyUpdateHook);

/* ── Compound unique index: one record per location+customer+month ── */
productionSchema.index(
  { location: 1, customer: 1, month: 1 },
  { unique: true }
);

const Production = mongoose.model("Production", productionSchema);
export default Production;