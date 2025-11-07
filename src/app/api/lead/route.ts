import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side apenas
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// Função auxiliar para gerar URL base (funciona local e em produção)
function getBaseUrl() {
  const url = process.env.APP_BASE_URL || process.env.VERCEL_URL;
  if (!url) return "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
}

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "MISSING_EMAIL" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const token = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // expira em 24h

    // Upsert: cria novo lead ou atualiza se já existir
    const { data: lead, error: upsertError } = await supabase
      .from("leads")
      .upsert({
        email: cleanEmail,
        name: name || null,
        confirmation_token: token,
        confirmation_sent_at: now.toISOString(),
        confirmation_expires_at: expires,
        confirmation_confirmed_at: null,
      }, { onConflict: "email" })
      .select("id, email")
      .single();

    if (upsertError) {
      console.error("DB_UPSERT_ERROR:", upsertError);
      return NextResponse.json({ ok: false, error: "DB_UPSERT_ERROR" }, { status: 500 });
    }

    const confirmUrl = `${getBaseUrl()}/api/confirm?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    // Enviar o e-mail de confirmação
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
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
      confirmUrl,
    });
  } catch (err: any) {
    console.error("UNEXPECTED_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", detail: err.message },
      { status: 500 }
    );
  }
}
