// src/lib/db.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env/server';

// Segurança extra: se por acaso alguém tentar importar isso no client, falha imediatamente.
if (typeof window !== 'undefined') {
  throw new Error('src/lib/db.ts é server-only. Não deve ser importado no client.');
}

// Opção: tipar o esquema do banco aqui, se tiver types gerados (ex.: Database)
// import type { Database } from '@/types/supabase'; // opcional

// Evita recriar o client em hot reload durante dev:
let _db:
  | ReturnType<typeof createClient>
  | undefined;

export function getDb() {
  if (_db) return _db;
  _db = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false },
      global: {
        headers: { 'x-application': 'atomic-crm' },
      },
    }
  );
  return _db;
}

// Atalho conveniente para imports existentes:
export const db = getDb();
