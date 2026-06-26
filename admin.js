import { supabase, companyName } from "./supabaseClient.js";
import { toISODate, mondayOf, addDays, fmtDate, getWeekNumber, statusIcon, escapeHtml } from "./utils.js";

let mode = "week";
let current = new Date();
let selectedBookingId = null;
let installers = [];
let bookings = [];


function setLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (!el) return;
  const now = new Date();
  el.textContent = "Senast uppdaterad: " + now.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function monthHeaderHtml() {
  return `
    <div class="month-weekday">v</div>
    <div class="month-weekday">Mån</div>
    <div class="month-weekday">Tis</div>
    <div class="month-weekday">Ons</div>
    <div class="month-weekday">Tors</div>
    <div class="month-weekday">Fre</div>
    <div class="month-weekday">Lör</div>
    <div class="month-weekday">Sön</div>
  `;
}

function dateRange(startIso, endIso) {
  const dates = [];
  const start = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T00:00:00");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates;

  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(toISODate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

function syncEndDateMin() {
  const startDate = document.getElementById("date").value;
  const endDate = document.getElementById("endDate");
  endDate.min = startDate;
  if (!endDate.value || endDate.value < startDate) endDate.value = startDate;
}


document.getElementById("companyName").textContent = companyName;

const sessionResult = await supabase.auth.getSession();
if (!sessionResult.data.session) location.href = "index.html";

async function loadAll() {
  const installersResult = await supabase
    .from("installers")
    .select("*")
    .eq("active", true)
    .order("name");

  if (installersResult.error) return alert("Kunde inte ladda montörer: " + installersResult.error.message);

  const bookingsResult = await supabase
    .from("bookings")
    .select("*, installers(name, color)")
    .order("booking_date")
    .order("start_time");

  if (bookingsResult.error) return alert("Kunde inte ladda bokningar: " + bookingsResult.error.message);

  installers = installersResult.data || [];
  bookings = normalizeBookings(bookingsResult.data || []);
  setLastUpdated();
  refreshInstallerUI();
  render();
}

function normalizeBookings(rows) {
  return rows.map(b => ({
    id: b.id,
    date: b.booking_date,
    start: String(b.start_time).slice(0,5),
    end: String(b.end_time).slice(0,5),
    installer_id: b.installer_id,
    installer_name: b.installers?.name || "Saknas",
    installer_color: b.installers?.color || "#64748b",
    customer: b.customer,
    location: b.location || "",
    status: b.status || "Bokad",
    notes: b.notes || ""
  }));
}

function refreshInstallerUI() {
  const selectedValue = document.getElementById("installer").value;
  const sel = document.getElementById("installer");
  sel.innerHTML = installers.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join("");
  if (installers.some(i => i.id === selectedValue)) sel.value = selectedValue;

  document.getElementById("legend").innerHTML = installers.map(i =>
    `<span class="chip"><span class="dot" style="background:${i.color}"></span>${escapeHtml(i.name)}</span>`
  ).join("");
}

function initForm() {
  const today = toISODate(new Date());
  document.getElementById("date").value = today;
  document.getElementById("endDate").value = today;
  syncEndDateMin();
}

function setEditMode(isEditing) {
  document.getElementById("formPanel").classList.toggle("edit-mode", isEditing);
  document.getElementById("formTitle").textContent = isEditing ? "Ändra bokning" : "Ny bokning";
  document.getElementById("saveBtn").textContent = isEditing ? "Spara ändring" : "Lägg till bokning";
  document.getElementById("editActions").classList.toggle("hidden", !isEditing);
}

function clearForm() {
  selectedBookingId = null;
  const today = toISODate(new Date());
  document.getElementById("date").value = today;
  document.getElementById("endDate").value = today;
  syncEndDateMin();
  document.getElementById("start").value = "08:00";
  document.getElementById("end").value = "12:00";
  if (installers[0]) document.getElementById("installer").value = installers[0].id;
  document.getElementById("customer").value = "";
  document.getElementById("location").value = "";
  document.getElementById("status").value = "Bokad";
  document.getElementById("notes").value = "";
  setEditMode(false);
  render();
}

function getFormBooking() {
  return {
    booking_date: document.getElementById("date").value,
    end_date: document.getElementById("endDate").value || document.getElementById("date").value,
    start_time: document.getElementById("start").value,
    end_time: document.getElementById("end").value,
    installer_id: document.getElementById("installer").value,
    customer: document.getElementById("customer").value.trim(),
    location: document.getElementById("location").value.trim(),
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim()
  };
}

function editBooking(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;

  selectedBookingId = b.id;
  document.getElementById("date").value = b.date;
  document.getElementById("endDate").value = b.date;
  syncEndDateMin();
  document.getElementById("start").value = b.start;
  document.getElementById("end").value = b.end;
  document.getElementById("installer").value = b.installer_id;
  document.getElementById("customer").value = b.customer;
  document.getElementById("location").value = b.location || "";
  document.getElementById("status").value = b.status || "Bokad";
  document.getElementById("notes").value = b.notes || "";
  setEditMode(true);
  render();
  document.getElementById("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function render() {
  document.getElementById("weekBtn").classList.toggle("active", mode === "week");
  document.getElementById("monthBtn").classList.toggle("active", mode === "month");
  document.getElementById("weekView").classList.toggle("hidden", mode !== "week");
  document.getElementById("monthView").classList.toggle("hidden", mode !== "month");

  renderMobileList();
  if (mode === "week") renderWeek();
  else renderMonth();
}

function renderMobileList() {
  const today = toISODate(new Date());
  const upcoming = bookings
    .filter(b => b.date >= today)
    .sort((a,b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
    .slice(0, 10);

  document.getElementById("mobileList").innerHTML = upcoming.map(b => `
    <div class="list-card" style="background:${b.installer_color}" data-booking-id="${b.id}">
      <div class="time">${escapeHtml(b.date)} ${escapeHtml(b.start)}–${escapeHtml(b.end)}</div>
      <div class="installer">${escapeHtml(b.installer_name)}</div>
      <div class="customer">${escapeHtml(b.customer)}</div>
      <div class="meta"><span>${escapeHtml(b.location)}</span><span class="status">${statusIcon(b.status)} ${escapeHtml(b.status)}</span></div>
    </div>
  `).join("") || `<div style="color:var(--muted);">Inga kommande bokningar.</div>`;

  document.querySelectorAll("[data-booking-id]").forEach(el => {
    el.addEventListener("click", () => editBooking(el.dataset.bookingId));
  });
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

  document.querySelectorAll("[data-calendar-booking-id]").forEach(el => {
    el.addEventListener("click", () => editBooking(el.dataset.calendarBookingId));
  });
}

function renderMonth() {
  const y = current.getFullYear();
  const m = current.getMonth();
  const first = new Date(y, m, 1);
  const start = mondayOf(first);
  document.getElementById("calTitle").textContent = first.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  document.getElementById("calSubtitle").textContent = "Månadsvy";

  const weeks = Array.from({length: 6}, (_, w) => Array.from({length: 7}, (_, d) => addDays(start, w * 7 + d)));
  const html = [monthHeaderHtml()];

  for (const week of weeks) {
    html.push(`<div class="month-weekno">v ${getWeekNumber(week[0])}</div>`);

    for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
      const d = week[dayIndex];
      const iso = toISODate(d);
      const muted = d.getMonth() !== m ? "opacity:.45;" : "";
      const weekend = dayIndex >= 5 ? "weekend" : "";
      const dayBookings = bookings.filter(b => b.date === iso).sort((a,b) => a.start.localeCompare(b.start));

      html.push(`<div class="month-cell ${weekend}" style="${muted}">
        <div class="month-date">${d.getDate()}</div>
        ${dayBookings.slice(0,3).map(b => {
          const selected = b.id === selectedBookingId ? "selected" : "";
          return `<span class="mini-booking ${selected}" data-calendar-booking-id="${b.id}" style="background:${b.installer_color}">${escapeHtml(b.start)} ${escapeHtml(b.installer_name)} – ${escapeHtml(b.customer)}</span>`;
        }).join("")}
        ${dayBookings.length > 3 ? `<span style="color:var(--muted); font-size:11px;">+${dayBookings.length - 3} fler</span>` : ""}
      </div>`);
    }
  }

  document.getElementById("monthView").innerHTML = html.join("");

  document.querySelectorAll("[data-calendar-booking-id]").forEach(el => {
    el.addEventListener("click", () => editBooking(el.dataset.calendarBookingId));
  });
}

function bookingHtml(b) {
  const selected = b.id === selectedBookingId ? "selected" : "";
  return `<article class="booking ${selected}" data-calendar-booking-id="${b.id}" style="background:${b.installer_color}">
    <div class="time">${escapeHtml(b.start)}–${escapeHtml(b.end)}</div>
    <div class="installer">${escapeHtml(b.installer_name)}</div>
    <div class="customer">${escapeHtml(b.customer)}</div>
    <div class="meta"><span>${escapeHtml(b.location)}</span><span class="status">${statusIcon(b.status)} ${escapeHtml(b.status)}</span></div>
  </article>`;
}

document.getElementById("saveBtn").onclick = async () => {
  const booking = getFormBooking();

  if (!booking.installer_id) return alert("Lägg till minst en montör först.");
  if (!booking.customer) return alert("Skriv kund eller jobb.");
  if (booking.end_time <= booking.start_time) return alert("Sluttiden behöver vara senare än starttiden.");
  if (booking.end_date < booking.booking_date) return alert("Slutdatum behöver vara samma dag eller senare än startdatum.");

  let result;

  if (selectedBookingId) {
    // Vid redigering ändras den valda bokningen. Flerdagarsjobb skapas när du gör en ny bokning.
    const updateBooking = { ...booking };
    delete updateBooking.end_date;
    result = await supabase.from("bookings").update(updateBooking).eq("id", selectedBookingId);
  } else {
    const dates = dateRange(booking.booking_date, booking.end_date);
    const rows = dates.map(date => ({
      booking_date: date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      installer_id: booking.installer_id,
      customer: booking.customer,
      location: booking.location,
      status: booking.status,
      notes: booking.notes
    }));

    result = await supabase.from("bookings").insert(rows);
  }

  if (result.error) return alert(result.error.message);

  clearForm();
  await loadAll();
};

document.getElementById("cancelBtn").onclick = clearForm;

document.getElementById("deleteBtn").onclick = async () => {
  if (!selectedBookingId) return;
  if (!confirm("Ta bort bokningen?")) return;

  const { error } = await supabase.from("bookings").delete().eq("id", selectedBookingId);
  if (error) return alert(error.message);

  clearForm();
  await loadAll();
};

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

document.getElementById("date").addEventListener("change", syncEndDateMin);

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  location.href = "index.html";
};

supabase
  .channel("booking-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadAll)
  .on("postgres_changes", { event: "*", schema: "public", table: "installers" }, loadAll)
  .subscribe();

initForm();
await loadAll();
setInterval(loadAll, 30000);
