const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const MEDIA_BUCKET = 'sos-media';

// Prefer service_role (bypasses RLS); fall back to anon key + storage policies.
const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
let supabase = null;

if (config.supabase.url && key) {
  supabase = createClient(
    config.supabase.url,
    key,
    { auth: { persistSession: false } }
  );
} else {
  console.warn('⚠️ Supabase not configured - media uploads will be disabled');
}

module.exports = { supabase, MEDIA_BUCKET };