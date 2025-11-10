import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Garante execução em runtime Node (não Edge) e desativa o cache
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Utilitário para obter a base URL do app
function baseUrl() {
  const url = process.env.APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
}

export async function POST(req: Request) {
  try {
    // Ler variáveis de ambiente dentro do handler (evita erro no build)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    // Valida envs
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: "MISSING_SUPABASE_ENVS" }, { status: 500 });
    }
    if (!resendKey || !from) {
      return NextResponse.json({ ok: false, error: "MISSING_EMAIL_ENVS" }, { status: 500 });
    }

    // Instanciar clientes em runtime
    const supabase = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    // Processar body
    const body = await req.json().catch(() => null);
    if (!body || !body.email) {
      return NextResponse.json({ ok: false, error: "MISSING_EMAIL" }, { status: 400 });
    }

    const cleanEmail = String(body.email).trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : null;

    // Criar token e timestamps
    const token = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Upsert do lead
    const { data: lead, error: upsertErr } = await supabase
      .from("leads")
      .upsert(
        {
          email: cleanEmail,
          name,
          confirmation_token: token,
          confirmation_sent_at: now.toISOString(),
          confirmation_expires_at: expires,
          confirmation_confirmed_at: null,
        },
        { onConflict: "email" }
      )
      .select("id,email")
      .single();

    if (upsertErr) {
      console.error("DB_UPSERT_ERROR:", upsertErr);
      return NextResponse.json({ ok: false, error: "DB_UPSERT_ERROR" }, { status: 500 });
    }

    // Montar link de confirmação
    const confirmUrl = `${baseUrl()}/api/confirm?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    // Enviar e-mail de confirmação
    try {
      await resend.emails.send({
        from,
        to: [cleanEmail],
        subject: "Confirme seu cadastro no Atomic CRM",
        html: `
          <p>Olá${name ? `, ${name}` : ""}!</p>
          <p>Confirme seu cadastro clicando no link abaixo:</p>
          <p><a href="${confirmUrl}">Confirmar e-mail</a></p>
          <p>Este link expira em 24 horas.</p>
        `,
      });
    } catch (mailErr: any) {
      console.error("MAIL_SEND_ERROR:", mailErr);
      return NextResponse.json({ ok: false, error: "MAIL_SEND_ERROR", detail: mailErr?.message }, { status: 502 });
    }

    // Retornar dados para o frontend
    return NextResponse.json(
      {
        ok: true,
        action: "send",
        id: lead.id,
        email: lead.email,
        confirmUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("UNEXPECTED_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", detail: err?.message },
      { status: 500 }
    );
  }
}
