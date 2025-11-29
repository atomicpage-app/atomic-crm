import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Resend } from "resend";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.CONFIRM_EMAIL_FROM || "no-reply@atomicpage.com.br";
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || "https://atomic-crm-qnrb.vercel.app";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://atomicpage.com.br";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase não configurado no servidor");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

type LeadPayload = {
  name: string;
  email: string;
  phone: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  origin_page?: string | null;
  origin_referrer?: string | null;
  lgpd_consent?: boolean;
  lgpd_consent_version?: string | null;
};

function validatePayload(body: any): { ok: boolean; message?: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "INVALID_BODY" };
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    return { ok: false, message: "INVALID_NAME" };
  }

  if (!body.email || typeof body.email !== "string") {
    return { ok: false, message: "INVALID_EMAIL" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { ok: false, message: "INVALID_EMAIL" };
  }

  if (!body.phone || typeof body.phone !== "string") {
    return { ok: false, message: "INVALID_PHONE" };
  }

  const cleanPhone = body.phone.replace(/\D/g, "");
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return { ok: false, message: "INVALID_PHONE" };
  }

  if (!body.lgpd_consent) {
    return { ok: false, message: "LGPD_CONSENT_REQUIRED" };
  }

  return { ok: true };
}

async function sendConfirmationEmail(params: {
  email: string;
  name: string;
  token: string;
}) {
  if (!resend) {
    console.warn("[lead] RESEND_API_KEY não configurado; pulando envio de e-mail");
    return;
  }

  const confirmUrl = `${PUBLIC_APP_URL}/confirm?token=${encodeURIComponent(
    params.token
  )}&email=${encodeURIComponent(params.email)}`;

  await resend.emails.send({
    from: `Atomic CRM <${EMAIL_FROM}>`,
    to: params.email,
    subject: "Confirme seu cadastro no Atomic CRM",
    html: `
      <p>Olá, ${params.name || "tudo bem"}?</p>
      <p>Recebemos seu cadastro para utilizar o Atomic CRM.</p>
      <p>Para confirmar e ativar seu acesso, clique no botão abaixo:</p>
      <p>
        <a href="${confirmUrl}" style="
          display:inline-block;
          padding: 10px 16px;
          background-color:#ec4899;
          color:#ffffff;
          text-decoration:none;
          border-radius:6px;
          font-weight:600;
        ">
          Confirmar meu cadastro
        </a>
      </p>
      <p>Se você não fez esse cadastro, pode ignorar este e-mail.</p>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeadPayload;

    const validation = validatePayload(body);
    if (!validation.ok) {
      return withCors(
        NextResponse.json(
          { ok: false, error: validation.message || "INVALID_PAYLOAD" },
          { status: 400 }
        )
      );
    }

    const email = body.email.trim().toLowerCase();
    const name = body.name.trim();
    const phone = body.phone.trim();

    // 1) Verifica se já existe lead para este e-mail
    const { data: existingLead, error: selectError } = await supabase
      .from("leads")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (selectError) {
      console.error("[lead] erro ao buscar lead existente:", selectError);
      return withCors(
        NextResponse.json(
          { ok: false, error: "DB_SELECT_ERROR" },
          { status: 500 }
        )
      );
    }

    // 2) Se já está confirmado, não gera novo token / e-mail
    if (existingLead && existingLead.confirmed_at) {
      return withCors(
        NextResponse.json(
          { ok: false, error: "LEAD_ALREADY_CONFIRMED" },
          { status: 400 }
        )
      );
    }

    // 3) Gera token e define expiração
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    // 4) Upsert do lead SEM confirmar
    const { data: upsertedLead, error: upsertError } = await supabase
      .from("leads")
      .upsert(
        {
          id: existingLead?.id,
          name,
          email,
          phone,
          source: "atomicpage-landing",
          utm_source: body.utm_source ?? null,
          utm_medium: body.utm_medium ?? null,
          utm_campaign: body.utm_campaign ?? null,
          utm_term: body.utm_term ?? null,
          utm_content: body.utm_content ?? null,
          origin_page: body.origin_page ?? null,
          origin_referrer: body.origin_referrer ?? null,
          lgpd_consent: !!body.lgpd_consent,
          lgpd_consent_version: body.lgpd_consent_version ?? null,
          confirmation_token: token,
          confirmation_expires_at: expiresAt.toISOString(),
          confirmation_sent_at: now.toISOString(),
          // IMPORTANTE: NÃO definir confirmed_at / consent_at aqui.
        },
        {
          onConflict: "email",
          ignoreDuplicates: false,
        }
      )
      .select("*")
      .single();

    if (upsertError || !upsertedLead) {
      console.error("[lead] erro no upsert:", upsertError);
      return withCors(
        NextResponse.json(
          { ok: false, error: "DB_UPSERT_ERROR" },
          { status: 500 }
        )
      );
    }

    // 5) Dispara e-mail de confirmação
    try {
      await sendConfirmationEmail({
        email,
        name,
        token,
      });
    } catch (emailError) {
      console.error("[lead] erro ao enviar e-mail de confirmação:", emailError);
      // Não falhar duro se o e-mail der erro; o lead e o token já estão salvos.
    }

    return withCors(
      NextResponse.json(
        {
          ok: true,
          leadId: upsertedLead.id,
          action: "confirm",
        },
        { status: 200 }
      )
    );
  } catch (err) {
    console.error("[lead] erro inesperado:", err);
    return withCors(
      NextResponse.json(
        { ok: false, error: "UNEXPECTED_ERROR" },
        { status: 500 }
      )
    );
  }
}
