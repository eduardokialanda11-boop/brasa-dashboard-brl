import { createClient } from "@supabase/supabase-js";

// Publishable browser credentials are supplied by the Vite environment.
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"];
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase environment variables are not configured.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});