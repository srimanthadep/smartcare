import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In development we log a warning so you remember to configure env vars.
  // The rest of the app will gracefully fall back to mock data.
  console.warn("Supabase env vars are missing. Falling back to mock appointments.");
}

export const supabase = createClient(
  supabaseUrl ?? "https://example.supabase.co",
  supabaseAnonKey ?? "anon-key-placeholder",
);

