// Supabase connection. The publishable key is designed to be public: every table is
// protected by row-level security (see supabase/migrations). Override with
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY if you point at another project.
const env = import.meta.env || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://dhktrjtfcasccxwbwqya.supabase.co';

export const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-4hOhFninMP1JHJAFlFGpw_aWPwKDpM';
