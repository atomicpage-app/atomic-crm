import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron";
import { createClient } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/email";

export const revalidate = 0;

export async function POST() {
  try {
    assertCronSecret();
    const db = createClient();

    // Reenvia confirmação para pendentes com +1h e ainda não expirados e sem reminder
    const now = new Date();
    const { data: pendings, error } = await db
      .from("leads_pending")
      .select("*")
      .lte("created_at", new Date(now.getTime() - 60 * 60 * 1000).toISOString())
      .gt("expires_at", now.toISOString())
      .eq("reminder_sent", false)
      .limit(100);

    if (error) throw error;

    let sent = 0;
    for (const p of pendings || []) {
      await sendConfirmationEmail({ email: p.email, token: p.token, name: p.name });
      await db.from("email_events").insert({ email: p.email, type: "confirmation_reminder_sent", meta: { pending_id: p.id } });
      await db.from("leads_pending").update({ reminder_sent: true }).eq("id", p.id);
      sent++;
    }

    return NextResponse.json({ ok: true, count: sent });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status });
  }
}
