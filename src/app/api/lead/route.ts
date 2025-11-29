import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Fail fast no boot
  throw new Error("Supabase environment variables are not configured");
}

const ALLOWED_ORIGIN = "https://atomicpage.com.br";

function buildCorsHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    ...extra,
  };
}

function jsonResponse(
  body: unknown,
  status: number = 200,
  extraHeaders: Record<string, string> = {}
) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: buildCorsHeaders(extraHeaders),
  });
}

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  created_at: string;
  consent_at: string | null;
  confirmed_at: string | null;
  confirmation_token: string | null;
  confirmation_sent_at: string | null;
  confirmation_expires_at: string | null;
  confirmation_confirmed_at: string | null;
};

function sanitizeString(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

function normalizeEmail(email: unknown): string {
  return sanitizeString(email).toLowerCase();
}

function extractSource(payload: any): string | null {
  const utmSource = sanitizeString(payload?.utm_source);
  if (utmSource) return utmSource;

  const explicitSource = sanitizeString(payload?.source);
  if (explicitSource) return explicitSource;

  return "atomicpage-landing";
}

export async function GET() {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("DB_LIST_ERROR", error);
    return jsonResponse(
      {
        ok: false,
        error: "DB_LIST_ERROR",
        message: "Não foi possível listar os leads.",
      },
      500
    );
  }

  return jsonResponse({ ok: true, leads: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return OPTIONS();
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    return jsonResponse(
      {
        ok: false,
        error: "INVALID_JSON",
        message: "Corpo da requisição inválido.",
      },
      400
    );
  }

  const name = sanitizeString(payload?.name);
  const email = normalizeEmail(payload?.email);
  const phoneRaw = sanitizeString(payload?.phone);
  const phone = phoneRaw || null;
  const source = extractSource(payload);
  const lgpdConsent = Boolean(payload?.lgpd_consent);

  if (!name || !email || !phone) {
    return jsonResponse(
      {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Nome, e-mail e telefone são obrigatórios.",
      },
      400
    );
  }

  const supabase = createSupabaseClient();

  // 1) Verifica se já existe lead para o e-mail
  const { data: existing, error: existingError } = await supabase
    .from("leads")
    .select("*")
    .eq("email", email)
    .maybeSingle<LeadRow>();

  if (existingError) {
    console.error("DB_LOOKUP_ERROR", existingError);
    return jsonResponse(
      {
        ok: false,
        error: "DB_LOOKUP_ERROR",
        message:
          "Não foi possível processar seu cadastro agora. Tente novamente em instantes.",
      },
      500
    );
  }

  // 2) Se já está confirmado, retorna erro amigável
  if (existing && existing.confirmed_at) {
    return jsonResponse(
      {
        ok: false,
        error: "LEAD_ALREADY_CONFIRMED",
        message:
          "Este e-mail já está cadastrado e confirmado. Se não encontrar nosso e-mail, verifique a caixa de spam ou promoções.",
      },
      409
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // +24h

  const confirmationToken =
    existing?.confirmation_token && !existing.confirmation_confirmed_at
      ? existing.confirmation_token
      : crypto.randomUUID();

  const consentAt =
    lgpdConsent || !existing ? nowIso : existing?.consent_at ?? null;

  const leadToUpsert: Partial<LeadRow> = {
    // se existir, preserva o id
    id: existing?.id,
    name,
    email,
    phone,
    source,
    consent_at: consentAt,
    // sempre começa como não confirmado via e-mail
    confirmed_at: null,
    confirmation_token: confirmationToken,
    confirmation_expires_at: expiresIso,
    confirmation_confirmed_at: null,
  };

  const { data: upserted, error: upsertError } = await supabase
    .from("leads")
    .upsert(leadToUpsert, { onConflict: "email" })
    .select()
    .maybeSingle<LeadRow>();

  if (upsertError || !upserted) {
    console.error("DB_UPSERT_ERROR", upsertError);
    return jsonResponse(
      {
        ok: false,
        error: "DB_UPSERT_ERROR",
        message:
          "Não foi possível salvar seus dados agora. Tente novamente em alguns instantes.",
      },
      500
    );
  }

  // Aqui você já tem o token e os dados do lead.
  // A lógica de disparo de e-mail deve usar `upserted.confirmation_token` + `upserted.email`.
  // Exemplo (se você já tiver um endpoint interno /api/send-confirmation ou similar):
  //
  // try {
  //   await fetch(`${process.env.APP_BASE_URL}/api/send-confirmation`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       email: upserted.email,
  //       name: upserted.name,
  //       token: upserted.confirmation_token,
  //     }),
  //   });
  // } catch (mailError) {
  //   console.error("MAIL_DISPATCH_ERROR", mailError);
  // }

  return jsonResponse(
    {
      ok: true,
      action: existing ? "updated" : "created",
      leadId: upserted.id,
      email: upserted.email,
      needsConfirmation: true,
      message:
        "Cadastro recebido com sucesso. Enviamos um e-mail para confirmação. Verifique sua caixa de entrada e spam.",
    },
    200
  );
}
