import { NextResponse } from "next/server";

export async function GET() {
  const mask = (v?: string | null) => (v ? `${v.slice(0, 8)}… (len:${v.length})` : null);

  const SUPABASE_URL = process.env.SUPABASE_URL || null;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
  const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
  const EMAIL_FROM = process.env.EMAIL_FROM || null;
  const APP_URL = process.env.APP_URL || null;
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS || null;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;

  return NextResponse.json({
    present: {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
      RESEND_API_KEY: !!RESEND_API_KEY,
      EMAIL_FROM: !!EMAIL_FROM,
      APP_URL: !!APP_URL,
      ADMIN_EMAILS: !!ADMIN_EMAILS,
      ADMIN_EMAIL: !!ADMIN_EMAIL
    },
    sample: {
      SUPABASE_URL: mask(SUPABASE_URL),
      EMAIL_FROM: EMAIL_FROM,
      APP_URL: APP_URL,
      ADMIN_EMAILS: ADMIN_EMAILS,
      ADMIN_EMAIL: ADMIN_EMAIL
    }
  });
}
