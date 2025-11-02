import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/token";
import { sendConfirmationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const { name, email, phone } = parsed.data;
    const emailNorm = email.trim().toLowerCase();

    const existing = await db.from("leads").select("id").eq("email", emailNorm).maybeSingle();
    if (existing.data) return NextResponse.json({ status: "already_registered" }, { status: 200 });

    const pending = await db.from("leads_pending").select("id").eq("email", emailNorm).maybeSingle();

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    if (pending.data) {
      await db.from("leads_pending").update({ token, expires_at: expiresAt, reminder_sent: false, name, phone }).eq("id", pending.data.id);
    } else {
      await db.from("leads_pending").insert({ name, email: emailNorm, phone, token, expires_at: expiresAt });
    }

    await sendConfirmationEmail({ name, email: emailNorm, token });
    await db.from("email_events").insert({ email: emailNorm, type: "confirmation_sent", meta: { route: "/api/lead" } });

    return NextResponse.json({ status: "pending_confirmation" }, { status: 202 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
