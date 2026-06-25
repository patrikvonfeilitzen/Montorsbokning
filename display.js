import { supabase, companyName } from "./supabaseClient.js";
import { toISODate, mondayOf, addDays, fmtDate, getWeekNumber, statusIcon, escapeHtml } from "./utils.js";

let mode = "week";
let current = new Date();
let bookings = [];

document.getElementById("companyName").textContent = companyName;

async function loadBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, installers(name, color)")
    .order("booking_date")
    .order("start_time");

  if (error) {
    console.error(error);
    return;
  }

  bookings = (data || []).map(b => ({
    id: b.id,
    date: b.booking_date,
    start: String(b.start_time).slice(0,5),
    end: String(b.end_time).slice(0,5),
    installer_name: b.installers?.name || "Saknas",
    installer_color: b.installers?.color || "#64748b",
    customer: b.customer,
    location: b.location || "",
    status: b.status || "Bokad"
  }));

  render();
}

function render() {
  document.getElementById("weekBtn").classList.toggle("active", mode === "week");
  document.getElementById("monthBtn").classList.toggle("active", mode === "month");
  document.getElementById("weekView").classList.toggle("hidden", mode !== "week");
  document.getElementById("monthView").classList.toggle("hidden", mode !== "month");

  if (mode === "week") renderWeek();
  else renderMonth();
}

function renderWeek() {
  const start = mondayOf(current);
  const days = Array.from({length: 5}, (_, i) => addDays(start, i));
  const weekNo = getWeekNumber(start);
  document.getElementById("calTitle").textContent = `Vecka ${weekNo}`;
  document.getElementById("calSubtitle").textContent = `${fmtDate(days[0])} – ${fmtDate(days[4])}`;

  const names = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"];
  document.getElementById("weekView").innerHTML = days.map((d, idx) => {
    const iso = toISODate(d);
    const dayBookings = bookings.filter(b => b.date === iso).sort((a,b) => a.start.localeCompare(b.start));

    return `<div class="day">
      <div class="day-title">${names[idx]}<span class="day-date">${fmtDate(d)}</span></div>
      ${dayBookings.map(bookingHtml).join("") || `<div style="color:var(--muted); padding:14px;">Inga bokningar</div>`}
    </div>`;
  }).join("");
}

function renderMonth() {
  const y = current.getFullYear();
  const m = current.getMonth();
  const first = new Date(y, m, 1);
  const start = mondayOf(first);
  document.getElementById("calTitle").textContent = first.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  document.getElementById("calSubtitle").textContent = "Månadsvy";

  const days = Array.from({length: 42}, (_, i) => addDays(start, i));
  document.getElementById("monthView").innerHTML = days.map(d => {
    const iso = toISODate(d);
    const muted = d.getMonth() !== m ? "opacity:.45;" : "";
    const dayBookings = bookings.filter(b => b.date === iso).sort((a,b) => a.start.localeCompare(b.start));

    return `<div class="month-cell" style="${muted}">
      <div class="month-date">${d.getDate()}</div>
      ${dayBookings.slice(0,4).map(b =>
        `<span class="mini-booking" style="background:${b.installer_color}">${escapeHtml(b.start)} ${escapeHtml(b.installer_name)} – ${escapeHtml(b.customer)}</span>`
      ).join("")}
      ${dayBookings.length > 4 ? `<span style="color:var(--muted); font-size:11px;">+${dayBookings.length - 4} fler</span>` : ""}
    </div>`;
  }).join("");
}

function bookingHtml(b) {
  return `<article class="booking" style="background:${b.installer_color}">
    <div class="time">${escapeHtml(b.start)}–${escapeHtml(b.end)}</div>
    <div class="installer">${escapeHtml(b.installer_name)}</div>
    <div class="customer">${escapeHtml(b.customer)}</div>
    <div class="meta"><span>${escapeHtml(b.location)}</span><span class="status">${statusIcon(b.status)} ${escapeHtml(b.status)}</span></div>
  </article>`;
}

document.getElementById("weekBtn").onclick = () => { mode = "week"; render(); };
document.getElementById("monthBtn").onclick = () => { mode = "month"; render(); };
document.getElementById("todayBtn").onclick = () => { current = new Date(); render(); };
document.getElementById("prevBtn").onclick = () => {
  current.setDate(current.getDate() + (mode === "week" ? -7 : -31));
  render();
};
document.getElementById("nextBtn").onclick = () => {
  current.setDate(current.getDate() + (mode === "week" ? 7 : 31));
  render();
};

supabase
  .channel("display-booking-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadBookings)
  .on("postgres_changes", { event: "*", schema: "public", table: "installers" }, loadBookings)
  .subscribe();

await loadBookings();
setInterval(loadBookings, 10000);
