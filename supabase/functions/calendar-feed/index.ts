import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function escapeIcs(value: string | null | undefined) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line: string) {
  const max = 73;
  if (line.length <= max) return line;
  const parts = [];
  let rest = line;
  while (rest.length > max) {
    parts.push(rest.slice(0, max));
    rest = " " + rest.slice(max);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function localToFloatingIcs(date: string, time: string) {
  const hhmmss = String(time || "00:00:00");
  const cleanTime = hhmmss.replaceAll(":", "").slice(0, 6).padEnd(6, "0");
  return `${date.replaceAll("-", "")}T${cleanTime}`;
}

function nowUtcIcs() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const installer = url.searchParams.get("installer");

  let query = supabase
    .from("bookings")
    .select("id, booking_date, start_time, end_time, customer, location, status, notes, installer_id, installers(name)")
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (installer) {
    query = query.eq("installer_id", installer);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(error.message, { status: 500, headers: corsHeaders });
  }

  const calendarName = installer ? "Montörsbokning" : "Montörsbokning alla";
  const dtstamp = nowUtcIcs();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Montorsbokning//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Stockholm"
  ];

  for (const b of data || []) {
    const installerName = Array.isArray(b.installers) ? b.installers[0]?.name : b.installers?.name;
    const title = `${installerName || "Montör"} – ${b.customer}`;
    const descriptionParts = [
      `Status: ${b.status || "Bokad"}`,
      b.notes ? `Kommentar: ${b.notes}` : "",
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@montorsbokning`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${localToFloatingIcs(b.booking_date, b.start_time)}`,
      `DTEND:${localToFloatingIcs(b.booking_date, b.end_time)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `LOCATION:${escapeIcs(b.location || "")}`,
      `DESCRIPTION:${escapeIcs(descriptionParts.join("\n"))}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=montorsbokning.ics",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
