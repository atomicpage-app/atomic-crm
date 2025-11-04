import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h
    const { error } = await db
      .from("leads_pending")
      .delete()
      .lt("created_at", cutoff);

    if (error) throw error;

    return NextResponse.json({ ok: true, deletedBefore: cutoff });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
  