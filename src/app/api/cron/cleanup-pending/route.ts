import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/cron";
import { createClient } from "@/lib/db";

export const revalidate = 0;

export async function POST() {
  try {
    assertCronSecret();
    const db = createClient();

    // Remove pendentes expirados
    const nowIso = new Date().toISOString();
    const { data: expired, error: selErr } = await db
      .from("leads_pending")
      .select("id")
      .lte("expires_at", nowIso)
      .limit(1000);

    if (selErr) throw selErr;

    let removed = 0;
    if (expired && expired.length) {
      const ids = expired.map((r) => r.id);
      const { error: delErr } = await db.from("leads_pending").delete().in("id", ids);
      if (delErr) throw delErr;
      removed = ids.length;
    }

    return NextResponse.json({ ok: true, removed });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status });
  }
}
