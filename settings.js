import { supabase, companyName } from "./supabaseClient.js";
import { escapeHtml, randomNiceColor, buildCalendarUrl } from "./utils.js";

let installers = [];
let bookings = [];

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
    .select("id, installer_id");

  if (bookingsResult.error) return alert("Kunde inte ladda bokningar: " + bookingsResult.error.message);

  installers = installersResult.data || [];
  bookings = bookingsResult.data || [];

  renderInstallers();
  renderCalendarLinks();
}

function renderInstallers() {
  document.getElementById("installerList").innerHTML = installers.map(i => {
    const bookingCount = bookings.filter(b => b.installer_id === i.id).length;
    return `<div class="installer-card">
      <input class="installer-color" type="color" value="${i.color}" data-id="${i.id}" data-action="color" />
      <input value="${escapeHtml(i.name)}" data-id="${i.id}" data-action="name" />
      <button class="danger" data-id="${i.id}" data-action="remove">Ta bort</button>
      <div></div>
      <div style="color: var(--muted); font-size: 12px;">${bookingCount} bokning${bookingCount === 1 ? "" : "ar"}</div>
      <div></div>
    </div>`;
  }).join("");

  document.querySelectorAll("[data-action='color']").forEach(el => {
    el.addEventListener("change", () => updateInstallerColor(el.dataset.id, el.value));
  });

  document.querySelectorAll("[data-action='name']").forEach(el => {
    el.addEventListener("change", () => updateInstallerName(el.dataset.id, el.value));
  });

  document.querySelectorAll("[data-action='remove']").forEach(el => {
    el.addEventListener("click", () => removeInstaller(el.dataset.id));
  });
}

function renderCalendarLinks() {
  document.getElementById("allCalendarUrl").value = buildCalendarUrl("");

  document.getElementById("installerCalendarLinks").innerHTML = installers.map(i => {
    const inputId = `cal_${i.id}`;
    return `
      <label>${escapeHtml(i.name)}</label>
      <div class="copy-row">
        <input id="${inputId}" readonly value="${escapeHtml(buildCalendarUrl(i.id))}" />
        <button data-copy-target="${inputId}">Kopiera</button>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-copy-target]").forEach(btn => {
    btn.addEventListener("click", () => copyInput(btn.dataset.copyTarget));
  });
}

async function copyInput(id) {
  const input = document.getElementById(id);
  if (!input || !input.value) {
    alert("Ingen kalenderlänk finns ännu. Kontrollera config.js.");
    return;
  }

  await navigator.clipboard.writeText(input.value);
  alert("Kopierat!");
}

async function updateInstallerName(id, name) {
  const i = installers.find(x => x.id === id);
  if (!i) return;

  const clean = name.trim();
  if (!clean) {
    alert("Montören måste ha ett namn.");
    renderInstallers();
    return;
  }

  const { error } = await supabase
    .from("installers")
    .update({ name: clean, color: i.color })
    .eq("id", id);

  if (error) alert(error.message);
  await loadAll();
}

async function updateInstallerColor(id, color) {
  const i = installers.find(x => x.id === id);
  if (!i) return;

  const { error } = await supabase
    .from("installers")
    .update({ name: i.name, color })
    .eq("id", id);

  if (error) alert(error.message);
  await loadAll();
}

async function removeInstaller(id) {
  const i = installers.find(x => x.id === id);
  if (!i) return;

  const count = bookings.filter(b => b.installer_id === id).length;
  if (count > 0) {
    alert(`${i.name} har ${count} bokning${count === 1 ? "" : "ar"}. Flytta eller ta bort bokningarna först.`);
    return;
  }

  if (!confirm(`Ta bort montören ${i.name}?`)) return;

  const { error } = await supabase
    .from("installers")
    .update({ active: false })
    .eq("id", id);

  if (error) alert(error.message);
  await loadAll();
}

async function addInstaller() {
  const nameInput = document.getElementById("newInstallerName");
  const colorInput = document.getElementById("newInstallerColor");
  const name = nameInput.value.trim();

  if (!name) return alert("Skriv ett namn på montören.");

  const { error } = await supabase
    .from("installers")
    .insert({ name, color: colorInput.value });

  if (error) return alert(error.message);

  nameInput.value = "";
  colorInput.value = randomNiceColor();
  await loadAll();
}

document.getElementById("addInstallerBtn").onclick = addInstaller;
document.getElementById("newInstallerName").addEventListener("keydown", e => {
  if (e.key === "Enter") addInstaller();
});

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  location.href = "index.html";
};

await loadAll();
