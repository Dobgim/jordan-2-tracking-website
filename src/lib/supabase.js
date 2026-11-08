import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

// Used by the admin dashboard (the public website talks to the database
// through the lighter fetch helpers in publicApi.js).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'thejordans-admin-auth' },
});
