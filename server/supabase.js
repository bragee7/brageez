const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const MEDIA_BUCKET = 'sos-media';

let supabase = null;

if (config.supabase.url && config.supabase.serviceRoleKey) {
  supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    { auth: { persistSession: false } }
  );
} else {
  console.warn('⚠️ Supabase not configured - media uploads will be disabled');
}

module.exports = { supabase, MEDIA_BUCKET };