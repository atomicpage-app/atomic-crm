// src/app/api/lead-send/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

function baseUrl() {
  const url = process.env.APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.email) {
      return NextResponse.json({ ok: false, error: "MISSING_EMAIL" }, { status: 400 });
    }

    const cleanEmail = String(body.email).trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : null;

    const token = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: lead, error: upsertErr } = await supabase
      .from("leads")
      .upsert({
        email: cleanEmail,
        name,
        confirmation_token: token,
        confirmation_sent_at: now.toISOString(),
        confirmation_expires_at: expires,
        confirmation_confirmed_at: null
      }, { onConflict: "email" })
      .select("id,email")
      .single();

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: "DB_UPSERT_ERROR" }, { status: 500 });
    }

    const confirmUrl = `${baseUrl()}/api/confirm?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: [cleanEmail],
      subject: "Confirme seu cadastro no Atomic CRM",
      html: `
        <p>Olá${name ? `, ${name}` : ""}!</p>
        <p>Confirme seu cadastro clicando no link abaixo:</p>
        <p><a href="${confirmUrl}">Confirmar e-mail</a></p>
        <p>Este link expira em 24 horas.</p>
      `,
    });

    return NextResponse.json({
      ok: true,
      action: "send",
      id: lead.id,
      email: lead.email,
      confirmUrl
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "UNEXPECTED_ERROR", detail: err?.message }, { status: 500 });
  }
}
