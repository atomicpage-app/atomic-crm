// src/app/api/lead/resend-confirmation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM =
  process.env.MAIL_FROM || "AtomicPage <no-reply@atomicpage.com.br>";
const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  "https://atomic-crm-qnrb.vercel.app";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/lead/resend-confirmation] Variáveis de ambiente do Supabase não configuradas corretamente."
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

function jsonResponse(body: any, init?: { status?: number }) {
  return new NextResponse(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function sendConfirmationEmailSafe(email: string, token: string) {
  if (!RESEND_API_KEY) {
    console.error(
      "[/api/lead/resend-confirmation] RESEND_API_KEY NOT CONFIGURED"
    );
    return {
      sent: false as const,
      reason: "RESEND_NOT_CONFIGURED" as const,
    };
  }

  const confirmUrl = `${APP_BASE_URL}/confirm?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(email)}`;

  const html = `
    <p>Olá,</p>
    <p>Recebemos seu interesse.</p>
    <p>Clique abaixo para confirmar seu cadastro:</p>
    <p>
      <a href="${confirmUrl}"
         style="padding:10px 18px;background:#ec4899;color:white;border-radius:6px;text-decoration:none;font-weight:600">
         Confirmar cadastro
      </a>
    </p>
    <p>Se você não pediu, ignore.</p>
  `;

  try {
    console.log(
      "[/api/lead/resend-confirmation] Enviando email de confirmação",
      {
        to: email,
        from: MAIL_FROM,
        confirmUrl,
      }
    );

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [email],
        subject: "Confirme seu cadastro",
        html,
      }),
    });

    const textBody = await res.text().catch(() => "");

    if (!res.ok) {
      console.error(
        "[/api/lead/resend-confirmation] RESEND_REQUEST_FAILED",
        {
          status: res.status,
          body: textBody,
        }
      );

      return {
        sent: false as const,
        reason: "RESEND_REQUEST_FAILED" as const,
        status: res.status,
        body: textBody,
      };
    }

    console.log(
      "[/api/lead/resend-confirmation] Email aceito pela API Resend",
      {
        status: res.status,
        body: textBody,
      }
    );

    return {
      sent: true as const,
      status: res.status,
      body: textBody,
    };
  } catch (err: any) {
    console.error(
      "[/api/lead/resend-confirmation] RESEND_UNEXPECTED_ERROR",
      err
    );
    return {
      sent: false as const,
      reason: "RESEND_UNEXPECTED_ERROR" as const,
      message: err?.message ?? "Erro desconhecido.",
    };
  }
}

// POST /api/lead/resend-confirmation
// Body: { email?: string; leadId?: string }
export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return jsonResponse(
        { ok: false, error: "Supabase não configurado no servidor." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonResponse(
        { ok: false, error: "Body inválido. Envie um JSON." },
        { status: 400 }
      );
    }

    let { email, leadId } = body as {
      email?: string;
      leadId?: string;
    };

    if (!email && !leadId) {
      return jsonResponse(
        {
          ok: false,
          error: "MISSING_IDENTIFIER",
          message: "Informe ao menos email ou leadId.",
        },
        { status: 400 }
      );
    }

    let query = supabase.from("leads").select("*").limit(1);

    if (leadId) {
      query = query.eq("id", leadId);
    } else if (email) {
      const normalizedEmail = email.toString().trim().toLowerCase();
      query = query.eq("email", normalizedEmail);
    }

    const { data: lead, error } = await query.single();

    if (error || !lead) {
      console.error(
        "[/api/lead/resend-confirmation] Lead não encontrado:",
        error
      );
      return jsonResponse(
        {
          ok: false,
          error: "LEAD_NOT_FOUND",
          message: "Lead não encontrado.",
        },
        { status: 404 }
      );
    }

    if (lead.confirmation_confirmed_at || lead.confirmed_at) {
      return jsonResponse(
        {
          ok: false,
          error: "LEAD_ALREADY_CONFIRMED",
          message: "Este lead já foi confirmado.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresInHours = 24;
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(
      now.getTime() + expiresInHours * 60 * 60 * 1000
    ).toISOString();

    console.log(
      "[/api/lead/resend-confirmation] Atualizando token de confirmação",
      {
        leadId: lead.id,
        email: lead.email,
        newToken,
        newExpiresAt,
      }
    );

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        confirmation_token: newToken,
        confirmation_expires_at: newExpiresAt,
        confirmation_sent_at: now.toISOString(),
        confirmation_confirmed_at: null,
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error(
        "[/api/lead/resend-confirmation] Erro ao atualizar lead:",
        updateError
      );
      return jsonResponse(
        {
          ok: false,
          error: "DB_TOKEN_UPDATE_ERROR",
          message: "Erro ao atualizar dados de confirmação.",
        },
        { status: 500 }
      );
    }

    const emailResult = await sendConfirmationEmailSafe(
      lead.email,
      newToken
    );

    return jsonResponse(
      {
        ok: true,
        leadId: lead.id,
        email: lead.email,
        name: lead.name,
        confirmation_expires_at: newExpiresAt,
        emailSent: emailResult.sent,
        emailMeta: emailResult,
      },
      { status: emailResult.sent ? 200 : 500 }
    );
  } catch (err) {
    console.error(
      "[/api/lead/resend-confirmation] Erro inesperado:",
      err
    );
    return jsonResponse(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Erro interno ao reenviar confirmação.",
      },
      { status: 500 }
    );
  }
}
