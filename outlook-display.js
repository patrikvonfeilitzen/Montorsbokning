let mode = "week";
let current = new Date();
let events = [];
const cfg = window.OUTLOOK_DISPLAY_CONFIG || {};
document.getElementById("companyName").textContent = cfg.COMPANY_NAME || "Montörsbokning";
document.getElementById("subtitle").textContent = cfg.SUBTITLE || "Outlook Signage";

function toISODate(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function mondayOf(date){const d=new Date(date);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);d.setHours(0,0,0,0);return d}
function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d}
function fmtDate(d){return d.toLocaleDateString("sv-SE",{day:"numeric",month:"short"})}
function getWeekNumber(d){d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const dayNum=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-dayNum);const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-yearStart)/86400000)+1)/7)}
function escapeHtml(str){return String(str||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function setLastUpdated(){const now=new Date();document.getElementById("lastUpdated").textContent="Senast uppdaterad: "+now.toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})}
function monthHeaderHtml(){return `<div class="month-weekday">v</div><div class="month-weekday">Mån</div><div class="month-weekday">Tis</div><div class="month-weekday">Ons</div><div class="month-weekday">Tors</div><div class="month-weekday">Fre</div><div class="month-weekday">Lör</div><div class="month-weekday">Sön</div>`}
function eventColor(event){const palette=["#2563eb","#16a34a","#ea580c","#7c3aed","#db2777","#0891b2","#0f766e"];let sum=0;for(const c of String(event.title||""))sum+=c.charCodeAt(0);return palette[sum%palette.length]}
function showError(message){const box=document.getElementById("errorBox");box.textContent=message;box.classList.remove("hidden")}
function clearError(){const box=document.getElementById("errorBox");box.textContent="";box.classList.add("hidden")}

async function loadEvents(){
  if(!cfg.OUTLOOK_FUNCTION_URL||cfg.OUTLOOK_FUNCTION_URL==="YOUR_OUTLOOK_FUNCTION_URL"){showError("OUTLOOK_FUNCTION_URL saknas i outlook-config.js");return}
  try{
    clearError();
    const res=await fetch(cfg.OUTLOOK_FUNCTION_URL,{cache:"no-store"});
    if(!res.ok)throw new Error(`Kunde inte läsa Outlook-kalendern (${res.status})`);
    const data=await res.json();
    events=data.events||[];
    setLastUpdated();
    render();
  }catch(err){showError(err.message||"Kunde inte läsa Outlook-kalendern.")}
}

function eventsForDate(iso){return events.filter(e=>e.date===iso).sort((a,b)=>String(a.start||"").localeCompare(String(b.start||"")))}
function render(){document.getElementById("weekBtn").classList.toggle("active",mode==="week");document.getElementById("monthBtn").classList.toggle("active",mode==="month");document.getElementById("weekView").classList.toggle("hidden",mode!=="week");document.getElementById("monthView").classList.toggle("hidden",mode!=="month");if(mode==="week")renderWeek();else renderMonth()}

function renderWeek(){
  const start=mondayOf(current);
  const days=Array.from({length:5},(_,i)=>addDays(start,i));
  const weekNo=getWeekNumber(start);
  document.getElementById("calTitle").textContent=`Vecka ${weekNo}`;
  document.getElementById("calSubtitle").textContent=`${fmtDate(days[0])} – ${fmtDate(days[4])}`;
  const names=["Måndag","Tisdag","Onsdag","Torsdag","Fredag"];
  document.getElementById("weekView").innerHTML=days.map((d,idx)=>{
    const iso=toISODate(d);const dayEvents=eventsForDate(iso);
    return `<div class="day"><div class="day-title">${names[idx]}<span class="day-date">${fmtDate(d)}</span></div>${dayEvents.map(eventHtml).join("")||`<div style="color:var(--muted); padding:14px;">Inga bokningar</div>`}</div>`;
  }).join("");
}

function renderMonth(){
  const y=current.getFullYear(),m=current.getMonth();
  const first=new Date(y,m,1);const start=mondayOf(first);
  document.getElementById("calTitle").textContent=first.toLocaleDateString("sv-SE",{month:"long",year:"numeric"});
  document.getElementById("calSubtitle").textContent="Månadsvy";
  const weeks=Array.from({length:6},(_,w)=>Array.from({length:7},(_,d)=>addDays(start,w*7+d)));
  const html=[monthHeaderHtml()];
  for(const week of weeks){
    html.push(`<div class="month-weekno">v ${getWeekNumber(week[0])}</div>`);
    for(let dayIndex=0;dayIndex<week.length;dayIndex++){
      const d=week[dayIndex];const iso=toISODate(d);const muted=d.getMonth()!==m?"opacity:.45;":"";const weekend=dayIndex>=5?"weekend":"";const dayEvents=eventsForDate(iso);
      html.push(`<div class="month-cell ${weekend}" style="${muted}"><div class="month-date">${d.getDate()}</div>${dayEvents.slice(0,4).map(e=>`<span class="mini-booking" style="background:${eventColor(e)}">${escapeHtml(e.start)} ${escapeHtml(e.title)}</span>`).join("")}${dayEvents.length>4?`<span style="color:var(--muted); font-size:11px;">+${dayEvents.length-4} fler</span>`:""}</div>`);
    }
  }
  document.getElementById("monthView").innerHTML=html.join("");
}

function eventHtml(e){return `<article class="booking" style="background:${eventColor(e)}"><div class="time">${escapeHtml(e.start)}–${escapeHtml(e.end)}</div><div class="installer">${escapeHtml(e.title)}</div><div class="customer">${escapeHtml(e.description||"")}</div><div class="meta"><span>${escapeHtml(e.location||"")}</span><span class="status">Outlook</span></div></article>`}

document.getElementById("weekBtn").onclick=()=>{mode="week";render()};
document.getElementById("monthBtn").onclick=()=>{mode="month";render()};
document.getElementById("todayBtn").onclick=()=>{current=new Date();render()};
document.getElementById("prevBtn").onclick=()=>{current.setDate(current.getDate()+(mode==="week"?-7:-31));render()};
document.getElementById("nextBtn").onclick=()=>{current.setDate(current.getDate()+(mode==="week"?7:31));render()};
await loadEvents();
setInterval(loadEvents,60000);
