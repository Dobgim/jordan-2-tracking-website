// Supabase connection. The anon key is designed to be public: every table is
// protected by row-level security (see supabase/migrations). Override with
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY if you point at another project.
const env = import.meta.env || {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://kvgciymtpheggqqchugg.supabase.co';

export const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Z2NpeW10cGhlZ2dxcWNodWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzE0NTksImV4cCI6MjEwNDYwNzQ1OX0.6xhdf_x2UQep16eISGxWXZAf4ei8nNDmKIauLgsKMJY';
