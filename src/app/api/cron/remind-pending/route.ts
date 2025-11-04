import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: leads, error } = await db
      .from("leads_pending")
      .select("*")
      .lt("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // 6h atrás
      .is("confirmed", false);

    if (error) throw error;

    let count = 0;
    for (const lead of leads || []) {
      await sendReminderEmail({ name: lead.name, email: lead.email, token: lead.token });
      count++;
    }

    return NextResponse.json({ ok: true, count });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
