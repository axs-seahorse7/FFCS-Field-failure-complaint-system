productionSchema.pre("save", async function (next) {
  // ✅ Warranty PPM (safe)
  if (this.production > 0) {
    this.warrantyPPM =
      (this.warrantyComplaint / this.production) * 1_000_000;
  } else {
    this.warrantyPPM = 0;
  }

  // ✅ Cumulative Production (monthly total based)
  const Production = mongoose.model("Production");

  const previous = await Production.aggregate([
    {
      $match: {
        customer: this.customer,
        commodity: this.commodity,
        month: { $lt: this.month },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$production" },
      },
    },
  ]);

  const prevTotal = previous[0]?.total || 0;
  this.cumulativeProduction = prevTotal + this.production;

  next();
});

