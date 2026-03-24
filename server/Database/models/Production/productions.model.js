import mongoose from "mongoose";


const productionSchema = new mongoose.Schema(
  {
    customer: {
      type: String,
      required: true,
      trim: true,
    },

    commodity: {
      type: String,
      required: true,
      enum: ["IDU", "ODU", "CBU", "WAC"],
    },

    month: {
      type: Date, // ✅ better than string
      required: true,
    },

    // 🔹 Entered ONCE per month
    production: {
      type: Number,
      required: true,
      min: 0,
    },

    // 🔹 Can be updated later
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

    // 🔹 Auto-calculated
    warrantyPPM: {
      type: Number,
      default: 0,
    },

    cumulativeProduction: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

productionSchema.pre("save", function (next) {
  if (this.isModified("production") || this.isModified("warrantyComplaint")) {
    this.warrantyPPM = this.production > 0 ? (this.warrantyComplaint / this.production) * 1e6 : 0;
  }
  next();
});

const Production = mongoose.model("Production", productionSchema);
export default Production;