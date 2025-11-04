import { cookies, headers } from "next/headers";

export function assertCronSecret() {
  const h = headers();
  const secret = process.env.CRON_SECRET;
  const provided = h.get("x-cron-secret") || h.get("X-Cron-Secret") || h.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !provided || provided !== secret) {
    const msg = "Forbidden: invalid or missing CRON_SECRET";
    throw Object.assign(new Error(msg), { status: 403 });
  }
}
