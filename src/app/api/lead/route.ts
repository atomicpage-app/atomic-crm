// src/app/api/lead/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =========================
// ENVIRONMENT
// =========================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM =
  process.env.MAIL_FROM || "AtomicPage <no-reply@atomicpage.com.br>";
const APP_BASE_URL =
  process.env.APP_BASE_URL || "https://atomic-crm-qnrb.vercel.app";

const ALLOWED_ORIGIN = "https://atomicpage.com.br";

// =========================
// TYPES
// =========================
type ExistingLead = {
  id: string;
  email: string;
  confirmed_at: string | null;
  confirmation_token: string | null;
  confirmation_expires_at: string | null;
  consent_at: string | null;
};

// =========================
// HELPERS
// =========================
function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function safeString(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeEmail(v: any): string {
  return safeString(v).toLowerCase();
}

function buildCorsHeaders(origin?: string | null) {
  const allowed = origin && origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function respondJson(body: any, status = 200, origin?: string | null) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: buildCorsHeaders(origin),
  });
}

// =========================
// OPTIONS (CORS preflight)
// =========================
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

// =========================
// SEND CONFIRMATION EMAIL
// =========================
async function sendConfirmationEmailSafe(email: string, token: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY NOT CONFIGURED");
    return { sent: false, reason: "RESEND_NOT_CONFIGURED" as const };
  }

  const confirmUrl = `${APP_BASE_URL}/api/confirm?token=${encodeURIComponent(
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

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("RESEND_REQUEST_FAILED", res.status, body);

      return {
        sent: false,
        reason: "RESEND_REQUEST_FAILED" as const,
        status: res.status,
        body,
      };
    }

    return { sent: true as const };
  } catch (e: any) {
    console.error("RESEND_UNEXPECTED_ERROR", e);
    return {
      sent: false,
      reason: "RESEND_UNEXPECTED_ERROR" as const,
      message: e?.message ?? "Erro desconhecido.",
    };
  }
}

// =========================
// GET (debug / painel)
// =========================
export async function GET(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("DB_LIST_ERROR", error);
      return respondJson(
        { ok: false, error: "DB_LIST_ERROR", message: "Erro ao listar." },
        500,
        origin
      );
    }

    return respondJson({ ok: true, leads: data ?? [] }, 200, origin);
  } catch (e) {
    console.error("GET_UNEXPECTED_ERROR", e);
    return respondJson(
      { ok: false, error: "UNEXPECTED_ERROR" },
      500,
      origin
    );
  }
}

// =========================
// POST — CRIA / ATUALIZA LEAD + ENVIA E-MAIL
// =========================
export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return respondJson(
      { ok: false, error: "INVALID_JSON", message: "JSON inválido." },
      400,
      origin
    );
  }

  const name = safeString(body.name);
  const email = normalizeEmail(body.email);
  const phone = safeString(body.phone);

  const utm_source = safeString(body.utm_source);
  const utm_medium = safeString(body.utm_medium);
  const utm_campaign = safeString(body.utm_campaign);
  const utm_term = safeString(body.utm_term);
  const utm_content = safeString(body.utm_content);

  const origin_page = safeString(body.origin_page);
  const origin_referrer = safeString(body.origin_referrer);

  const lgpd_consent = body.lgpd_consent === true;
  const lgpd_consent_version = safeString(body.lgpd_consent_version);

  if (!name || !email || !phone) {
    return respondJson(
      {
        ok: false,
        error: "MISSING_FIELDS",
        message: "Nome, e-mail e telefone são obrigatórios.",
      },
      400,
      origin
    );
  }

  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return respondJson(
      { ok: false, error: "INVALID_EMAIL", message: "E-mail inválido." },
      400,
      origin
    );
  }

  const supabase = getSupabaseAdmin();

  // ===== VERIFICA LEAD EXISTENTE =====
  const { data: existingLead, error: existingError } = await supabase
    .from("leads")
    .select(
      `
      id,
      email,
      confirmed_at,
      confirmation_token,
      confirmation_expires_at,
      consent_at
    `
    )
    .eq("email", email)
    .maybeSingle<ExistingLead>();

  if (existingError) {
    console.error("DB_LOOKUP_ERROR", existingError);
    return respondJson(
      { ok: false, error: "DB_LOOKUP_ERROR" },
      500,
      origin
    );
  }

  if (existingLead?.confirmed_at) {
    return respondJson(
      {
        ok: false,
        error: "LEAD_ALREADY_CONFIRMED",
        message: "Este e-mail já foi confirmado anteriormente.",
      },
      400,
      origin
    );
  }

  const now = new Date().toISOString();

  // ===== UPSERT =====
  const { data: upserted, error: upsertError } = await supabase
    .from("leads")
    .upsert(
      {
        id: existingLead?.id,
        name,
        email,
        phone,
        consent_at: lgpd_consent
          ? now
          : existingLead?.consent_at ?? null,
        source: utm_source || "atomicpage-landing",
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        origin_page: origin_page || null,
        origin_referrer: origin_referrer || null,
        lgpd_consent,
        lgpd_consent_version: lgpd_consent_version || null,
        updated_at: now,
      },
      { onConflict: "email" }
    )
    .select("id,email,confirmed_at")
    .single();

  if (upsertError || !upserted) {
    console.error("DB_UPSERT_ERROR", upsertError);
    return respondJson(
      { ok: false, error: "DB_UPSERT_ERROR" },
      500,
      origin
    );
  }

  if (upserted.confirmed_at) {
    return respondJson(
      {
        ok: true,
        leadId: upserted.id,
        status: "already_confirmed",
        email: { sent: false, reason: "ALREADY_CONFIRMED" },
      },
      200,
      origin
    );
  }

  // ===== GERA TOKEN =====
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

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
    console.error("DB_TOKEN_UPDATE_ERROR", updateTokenError);
    return respondJson(
      {
        ok: false,
        error: "DB_TOKEN_UPDATE_ERROR",
      },
      500,
      origin
    );
  }

  // ===== ENVIO DE EMAIL =====
  const emailResult = await sendConfirmationEmailSafe(email, token);

  return respondJson(
    {
      ok: true,
      leadId: upserted.id,
      status: existingLead ? "updated" : "created",
      email: emailResult,
    },
    200,
    origin
  );
}
