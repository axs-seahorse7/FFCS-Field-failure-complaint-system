// controllers/actionPlan.controller.js
import ActionPlan from "../models/actionPlan.model.js";

/* ═══════════════════════════════════════════════════════
   GET /action-plans
═══════════════════════════════════════════════════════ */
export const getActionPlans = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ defect: re }, { supplier: re }, { action: re }];
    }

    const data = await ActionPlan.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /action-plans
═══════════════════════════════════════════════════════ */
export const createActionPlan = async (req, res) => {
  try {
    const plan = await ActionPlan.create({ ...req.body, createdBy: req.user._id });
    return res.status(201).json({ data: plan });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   PUT /action-plans/:id
═══════════════════════════════════════════════════════ */
export const updateActionPlan = async (req, res) => {
  try {
    const plan = await ActionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ message: "Action plan not found" });
    return res.json({ data: plan });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════
   POST /action-plans/delete
   Body: { id }
═══════════════════════════════════════════════════════ */
export const deleteActionPlan = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "id required" });
    const plan = await ActionPlan.findByIdAndDelete(id);
    if (!plan) return res.status(404).json({ message: "Action plan not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
