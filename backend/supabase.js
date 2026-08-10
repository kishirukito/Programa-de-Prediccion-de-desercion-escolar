import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[SUPABASE] Variables de entorno no definidas — usando datos mock');
}

export const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export const isSupabaseReady = () => supabase !== null;

/**
 * Helper genérico: si Supabase disponible lo usa, si no retorna fallback
 */
export async function dbQuery(fn, fallback) {
  if (!supabase) return fallback;
  try {
    return await fn(supabase);
  } catch (e) {
    console.error('[SUPABASE ERROR]', e.message);
    return fallback;
  }
}
