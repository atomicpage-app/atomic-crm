// src/lib/db.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env/server';

export const db = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY, // ⚠️ Service Role (não a anon)
  {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'atomic-crm-server' } },
  }
);