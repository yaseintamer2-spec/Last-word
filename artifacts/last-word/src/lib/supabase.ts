import { createClient } from '@supabase/supabase-js';

// Hardcoded as fallback — also readable from .env for local dev
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      ?? 'https://cejdcyrqpvswdtyczedz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlamRjeXJxcHZzd3R5Y3plZHoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3ODI2NzgwNiwiZXhwIjoyMDkzODQzODA2fQ.B3bJlSNq9J__7LUGuAGqkggXR8_P5woL7bpN8AwwQXs';

let supabaseClient;
try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
    console.error("SUPABASE: Initialization Error", err);
}

export const supabase = supabaseClient!;
export const isSupabaseReady = !!supabaseClient;
