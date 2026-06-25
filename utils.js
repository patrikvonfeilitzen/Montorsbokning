export function toISODate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
}

export function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0,0,0,0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function fmtDate(d) {
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

export function statusIcon(status) {
  return { "Klar": "✅", "Pågående": "🟡", "Ombokas": "🔁", "Bokad": "📌" }[status] || "📌";
}

export function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

export function randomNiceColor() {
  const colors = ["#db2777", "#0891b2", "#4f46e5", "#65a30d", "#d97706", "#9333ea", "#0f766e"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function buildCalendarUrl(installerId = "") {
  const cfg = window.APP_CONFIG || {};
  const base = cfg.CALENDAR_FUNCTION_URL;
  if (!base || base === "YOUR_CALENDAR_FUNCTION_URL") return "";
  const url = new URL(base);
  if (installerId) url.searchParams.set("installer", installerId);
  return url.toString();
}
