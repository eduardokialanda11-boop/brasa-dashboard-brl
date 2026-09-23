import { createClient } from "@supabase/supabase-js";

// A publishable key is designed to be used safely by browser applications.
const SUPABASE_URL = "https://npxytlxjnoqpyoukpppi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IQvKyT37_wa2iMnimS9o7g_3NwydOHi";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});