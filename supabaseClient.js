import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const cfg = window.APP_CONFIG || {};

if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL === "YOUR_SUPABASE_URL") {
  alert("Supabase saknas. Fyll i config.js först.");
}

export const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
export const companyName = cfg.COMPANY_NAME || "Montörsbokning";
