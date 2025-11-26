import { NextRequest } from "next/server";

// ============================================================================
// CONFIGURAÇÕES DE CORS
// ============================================================================

// Produção
const PROD_ORIGIN = "https://atomicpage.com.br";

// Desenvolvimento (opcional)
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "null", // permite testes via file://
];

// Verifica se a origem é permitida
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  if (origin === PROD_ORIGIN) return true;
  if (DEV_ORIGINS.includes(origin)) return true;

  return false;
}

// Gera headers CORS adequados
function corsHeaders(origin: string | null): HeadersInit {
  const allowed = isAllowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin! : PROD_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
  };
}

// ============================================================================
// HANDLER OPTIONS (pré-flight CORS)
// ============================================================================
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// ============================================================================
// HANDLER POST - CRIAÇÃO DE LEAD
// ============================================================================
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  let body: any;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "INVALID_JSON" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Campos esperados
  const {
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
  } = body ?? {};

  // Validações mínimas
  if (!name || !email || !phone) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "MISSING_REQUIRED_FIELDS",
        message: "Campos obrigatórios ausentes: name, email, phone.",
      }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  if (lgpd_consent !== true) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "LGPD_CONSENT_REQUIRED",
        message: "Você deve aceitar os termos da LGPD para continuar.",
      }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // ============================================================================
  // >>>>> AQUI VOCÊ PLUGA SUA LÓGICA DE CRIAÇÃO DE LEAD <<<<<
  //
  // EXEMPLO:
  //
  // const result = await createLead({
  //   name,
  //   email,
  //   phone,
  //   tracking: {
  //     utm_source,
  //     utm_medium,
  //     utm_campaign,
  //     utm_term,
  //     utm_content,
  //     origin_page,
  //     origin_referrer,
  //   },
  //   lgpd_consent,
  //   lgpd_consent_version: lgpd_consent_version || "v1",
  // });
  //
  // if (!result.ok) {
  //   return new Response(JSON.stringify(result), {
  //     status: 400,
  //     headers: { ...headers, "Content-Type": "application/json" },
  //   });
  // }
  //
  // return new Response(JSON.stringify(result), {
  //   status: 201,
  //   headers: { ...headers, "Content-Type": "application/json" },
  // });
  // ============================================================================

  // STUB TEMPORÁRIO PARA TESTES
  const dummy = {
    ok: true,
    action: "pending_confirmation",
    message:
      "Lead recebido com sucesso. Verifique seu e-mail para confirmar o cadastro.",
  };

  return new Response(JSON.stringify(dummy), {
    status: 201,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}