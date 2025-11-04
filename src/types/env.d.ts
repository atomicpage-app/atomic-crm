// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    APP_URL: string;

    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;

    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;

    RESEND_API_KEY: string;
    EMAIL_FROM: string;

    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    CRON_SECRET: string;

    ADMIN_EMAIL?: string;
    ADMIN_EMAILS?: string;
  }
}
