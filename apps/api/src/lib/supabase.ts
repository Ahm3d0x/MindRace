import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
    'Please check your .env file.'
  );
}

/**
 * Supabase Admin Client
 * 
 * Uses the service role key for full database access.
 * This client bypasses Row Level Security — use only on the server side.
 * 
 * For user-scoped operations, create a per-request client using
 * the user's JWT with `createClient(url, anonKey, { global: { headers: { Authorization } } })`.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export { supabaseUrl };
