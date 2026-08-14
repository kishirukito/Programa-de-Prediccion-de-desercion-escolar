import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (supabase) {
  console.log('[SUPABASE] Conectado a', SUPABASE_URL);
} else {
  console.error('[SUPABASE] ⚠️  Variables de entorno no configuradas.');
}
