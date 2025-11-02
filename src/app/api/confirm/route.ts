import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: pending } = await db.from("leads_pending").select("*").eq("token", token).maybeSingle();
  if (!pending) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired token" }, { status: 400 });
  }

  const insert = await db.from("leads").insert({
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    confirmed_at: new Date().toISOString(),
    consent_at: new Date().toISOString()
  });
  if (insert.error && !/duplicate/i.test(insert.error.message)) {
    return NextResponse.json({ error: "Insert error" }, { status: 500 });
  }

  await db.from("leads_pending").delete().eq("id", pending.id);

  await sendWelcomeEmail({ name: pending.name, email: pending.email });
  await db.from("email_events").insert({
    email: pending.email,
    type: "confirmed_email",
    meta: { route: "/api/confirm" }
  });

  return NextResponse.redirect(new URL("/confirm/success", process.env.APP_URL).toString());
}

