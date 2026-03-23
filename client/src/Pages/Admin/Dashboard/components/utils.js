// components/utils.js
export const CHART_COLORS = [
  "#e53935","#3B7DDD","#34B1AA","#F29F67","#8B5CF6",
  "#F59E0B","#10B981","#EF4444","#6366F1","#EC4899",
  "#06B6D4","#84CC16","#FB923C","#A78BFA","#F472B6",
];

export const fmtNum = (n) => Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (v) => v
  ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
export const fmtDT = (v) => v
  ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";
