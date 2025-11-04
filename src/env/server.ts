// src/env/server.ts
import 'server-only';

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',

  // Auth / NextAuth
  NEXTAUTH_URL: requireEnv('NEXTAUTH_URL'),
  NEXTAUTH_SECRET: requireEnv('NEXTAUTH_SECRET'),

  // Google OAuth (se usar)
  GOOGLE_CLIENT_ID: requireEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: requireEnv('GOOGLE_CLIENT_SECRET'),

  // Resend
  RESEND_API_KEY: requireEnv('RESEND_API_KEY'),
  EMAIL_FROM: requireEnv('EMAIL_FROM'),

  // Supabase (role key é SEMPRE server-only)
  SUPABASE_URL: requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // Segurança de rotas internas/cron
  CRON_SECRET: requireEnv('CRON_SECRET'),

  // Lista de admins (opcional)
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? '',
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? '',
};
