// src/app/api/lead/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// E-mail provider (ex.: Resend)
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM =
  process.env.MAIL_FROM || "AtomicPage <no-reply@atomicpage.com.br>";
const APP_BASE_URL =
  process.env.APP_BASE_URL || "https://atomic-crm-qnrb.vercel.app";

const ALLOWED_ORIGIN = "https://atomicpage.com.br";

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function buildCorsHeaders(origin?: string | null) {
  const allowed =
    origin && origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function corsJson(body: any, init?: number | ResponseInit) {
  const status = typeof init === "number" ? init : init?.status;
  const headersInit =
    typeof init === "object" && init?.headers ? init.headers : undefined;

  const headers = new Headers(headersInit);
  const origin =
    typeof window === "undefined"
      ? undefined
      : (typeof window !== "undefined" && window.location.origin) || undefined;

  const corsHeaders = buildCorsHeaders(origin);

  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

  return new NextResponse(JSON.stringify(body), {
    status: status ?? 200,
    headers,
  });
}

// ===== OPTIONS (CORS pré-flight) =====
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const headers = buildCorsHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

// ===== GET: lista simples de leads (debug / painel) =====
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const headers = buildCorsHeaders(origin);

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,name,email,phone,confirmed_at,consent_at,source,created_at,confirmation_token,confirmation_sent_at,confirmation_expires_at,confirmation_confirmed_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[GET /api/lead] DB error:", error);
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "DB_LIST_ERROR",
          message: "Erro ao listar leads.",
        }),
        { status: 500, headers }
      );
    }

    return new NextResponse(
      JSON.stringify({
        ok: true,
        leads: data ?? [],
      }),
      { status: 200, headers }
    );
  } catch (e: any) {
    console.error("[GET /api/lead] Unexpected error:", e);
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Erro inesperado ao listar leads.",
      }),
      { status: 500, headers }
    );
  }
}

// ===== Função segura para envio de e-mail =====
async function sendConfirmationEmailSafe(email: string, token: string) {
  if (!RESEND_API_KEY) {
    console.error(
      "[sendConfirmationEmailSafe] RESEND_API_KEY não configurada. E-mail não será enviado."
    );
    return { sent: false, reason: "RESEND_NOT_CONFIGURED" as const };
  }

  const confirmUrl = `${APP_BASE_URL}/api/confirm?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(email)}`;

  const html = `
    <p>Olá,</p>
    <p>Recebemos seu interesse na AtomicPage / AtomicCRM.</p>
    <p>Para confirmar seu cadastro, clique no botão abaixo:</p>
    <p>
      <a href="${confirmUrl}" 
         style="display:inline-block;padding:10px 18px;background:#ec4899;color:#ffffff;
                text-decoration:none;border-radius:6px;font-weight:600">
        Confirmar cadastro
      </a>
    </p>
    <p>Se você não fez essa solicitação, pode ignorar este e-mail.</p>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [email],
        subject: "Confirme seu cadastro - AtomicPage / AtomicCRM",
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "[sendConfirmationEmailSafe] Resend error status:",
        res.status,
        "body:",
        text
      );
      return {
        sent: false,
        reason: "RESEND_REQUEST_FAILED" as const,
        status: res.status,
        body: text,
      };
    }

    return { sent: true as const };
  } catch (e: any) {
    console.error("[sendConfirmationEmailSafe] Unexpected error:", e);
    return {
      sent: false as const,
      reason: "RESEND_UNEXPECTED_ERROR" as const,
      message: e?.message ?? "Erro desconhecido ao enviar e-mail.",
    };
  }
}

// ===== POST: cria/atualiza lead + gera token + envia e-mail =====
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = buildCorsHeaders(origin);

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "INVALID_BODY",
          message: "Payload inválido.",
        }),
        { status: 400, headers }
      );
    }

    let {
      name,
      email,
      phone,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      origin_page,
      origin_referrer,
      lgpd_consent,
      lgpd_consent_version,
    } = body as any;

    name = typeof name === "string" ? name.trim() : "";
    email =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    phone = typeof phone === "string" ? phone.trim() : "";

    if (!name || !email || !phone) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "MISSING_FIELDS",
          message: "Nome, e-mail e telefone são obrigatórios.",
        }),
        { status: 400, headers }
      );
    }

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "INVALID_EMAIL",
          message: "E-mail inválido.",
        }),
        { status: 400, headers }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verifica se já existe lead para este e-mail
    const { data: existingLead, error: existingError } = await supabase
      .from("leads")
      .select(
        "id,email,confirmed_at,confirmation_token,confirmation_expires_at"
      )
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error(
        "[POST /api/lead] Error loading existing lead:",
        existingError
      );
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "DB_LOOKUP_ERROR",
          message: "Erro ao verificar lead existente.",
        }),
        { status: 500, headers }
      );
    }

    if (existingLead && existingLead.confirmed_at) {
      // já está confirmado
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "LEAD_ALREADY_CONFIRMED",
          message:
            "Este e-mail já foi confirmado anteriormente. Caso precise de ajuda, entre em contato.",
        }),
        { status: 400, headers }
      );
    }

    const now = new Date().toISOString();

    // Upsert do lead (cria ou atualiza dados básicos)
    const { data: upserted, error: upsertError } = await supabase
      .from("leads")
      .upsert(
        {
          name,
          email,
          phone,
          consent_at:
            lgpd_consent === true ? now : existingLead?.consent_at ?? null,
          source: utm_source || "atomicpage-landing",
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          utm_term: utm_term || null,
          utm_content: utm_content || null,
          origin_page: origin_page || null,
          origin_referrer: origin_referrer || null,
          lgpd_consent: lgpd_consent === true,
          lgpd_consent_version:
            lgpd_consent_version || existingLead?.lgpd_consent_version || null,
        },
        {
          onConflict: "email",
        }
      )
      .select("id,email,confirmed_at")
      .single();

    if (upsertError || !upserted) {
      console.error("[POST /api/lead] DB upsert error:", upsertError);
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "DB_UPSERT_ERROR",
          message:
            "Não foi possível salvar seus dados no momento. Tente novamente em alguns minutos.",
        }),
        { status: 500, headers }
      );
    }

    // Se por algum motivo já estiver confirmado aqui, não envia email
    if (upserted.confirmed_at) {
      return new NextResponse(
        JSON.stringify({
          ok: true,
          leadId: upserted.id,
          status: "already_confirmed",
          email: { sent: false, reason: "ALREADY_CONFIRMED" },
        }),
        { status: 200, headers }
      );
    }

    // Gera token de confirmação e atualiza lead
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24h

    const { error: updateTokenError } = await supabase
      .from("leads")
      .update({
        confirmation_token: token,
        confirmation_sent_at: now,
        confirmation_expires_at: expires,
        confirmation_confirmed_at: null,
      })
      .eq("id", upserted.id);

    if (updateTokenError) {
      console.error(
        "[POST /api/lead] Error updating confirmation token:",
        updateTokenError
      );
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "DB_TOKEN_UPDATE_ERROR",
          message:
            "Lead salvo, mas houve erro ao preparar a confirmação por e-mail.",
        }),
        { status: 500, headers }
      );
    }

    // Envia e-mail de confirmação (com tratamento de erro sem quebrar o fluxo)
    const emailResult = await sendConfirmationEmailSafe(email, token);

    return new NextResponse(
      JSON.stringify({
        ok: true,
        leadId: upserted.id,
        status: existingLead ? "updated" : "created",
        email: emailResult,
      }),
      { status: 200, headers }
    );
  } catch (e: any) {
    console.error("[POST /api/lead] Unexpected error:", e);
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "UNEXPECTED_ERROR",
        message:
          "Erro inesperado ao processar seu cadastro. Tente novamente em alguns minutos.",
      }),
      { status: 500, headers }
    );
  }
}
