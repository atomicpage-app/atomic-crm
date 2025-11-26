import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase env vars are missing");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ALLOWED_ORIGINS = [
  "https://atomicpage.com.br",
  "https://www.atomicpage.com.br",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "null", // origin do file:// em alguns browsers
];

function getOrigin(req: NextRequest): string | null {
  return req.headers.get("origin");
}

function buildCorsHeaders(origin: string | null) {
  const headers = new Headers();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    // fallback seguro
    headers.set("Access-Control-Allow-Origin", "https://atomicpage.com.br");
  }

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Origin, X-Requested-With"
  );
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Credentials", "true");

  return headers;
}

function jsonWithCors(
  origin: string | null,
  body: unknown,
  init?: number | ResponseInit
) {
  const response =
    typeof init === "number"
      ? new NextResponse(JSON.stringify(body), {
          status: init,
          headers: { "Content-Type": "application/json" },
        })
      : new NextResponse(JSON.stringify(body), {
          ...(init || {}),
          headers: {
            "Content-Type": "application/json",
            ...(init && "headers" in init ? (init as any).headers : {}),
          },
        });

  const headers = buildCorsHeaders(origin);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export async function OPTIONS(req: NextRequest) {
  const origin = getOrigin(req);
  const headers = buildCorsHeaders(origin);
  return new NextResponse(null, { status: 204, headers });
}

type LeadInsertPayload = {
  name: string;
  email: string;
  phone: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  origin_page?: string;
  origin_referrer?: string;
  lgpd_consent?: boolean;
  lgpd_consent_version?: string;
};

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = (await req.json().catch(() => null)) as LeadInsertPayload | null;

    if (!body) {
      return jsonWithCors(origin, { ok: false, error: "INVALID_JSON" }, 400);
    }

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
    } = body;

    // validações mínimas
    if (!name || !email || !phone) {
      return jsonWithCors(
        origin,
        { ok: false, error: "MISSING_REQUIRED_FIELDS" },
        400
      );
    }

    if (!lgpd_consent) {
      return jsonWithCors(origin, { ok: false, error: "LGPD_NOT_ACCEPTED" }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, "");

    console.log("[POST /api/lead] incoming payload", {
      name,
      normalizedEmail,
      cleanPhone,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      origin_page,
      origin_referrer,
      lgpd_consent,
      lgpd_consent_version,
    });

    // verifica lead existente por e-mail
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("leads")
      .select("*")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("[POST /api/lead] error fetching existing lead", existingError);
      return jsonWithCors(origin, { ok: false, error: "DB_SELECT_ERROR" }, 500);
    }

    if (existing && (existing as any).confirmed_at) {
      console.log("[POST /api/lead] lead already confirmed", {
        id: existing.id,
        email: existing.email,
      });
      return jsonWithCors(
        origin,
        { ok: false, error: "LEAD_ALREADY_CONFIRMED" },
        409
      );
    }

    const confirmationToken = crypto.randomUUID();

    const payloadToSave: any = {
      name,
      email: normalizedEmail,
      phone: cleanPhone,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      origin_page,
      origin_referrer,
      lgpd_consent,
      lgpd_consent_version,
      confirmation_token: confirmationToken,
      status: "pending",
    };

    let upsertResult;

    if (existing) {
      console.log("[POST /api/lead] updating existing pending lead", {
        id: existing.id,
      });
      upsertResult = await supabase
        .from("leads")
        .update(payloadToSave)
        .eq("id", existing.id)
        .select("id")
        .single();
    } else {
      console.log("[POST /api/lead] inserting new lead");
      upsertResult = await supabase
        .from("leads")
        .insert(payloadToSave)
        .select("id")
        .single();
    }

    const { data: leadRow, error: upsertError } = upsertResult;

    if (upsertError || !leadRow) {
      console.error("[POST /api/lead] error inserting/updating lead", upsertError);
      return jsonWithCors(origin, { ok: false, error: "DB_UPSERT_ERROR" }, 500);
    }

    console.log("[POST /api/lead] lead saved successfully", {
      id: leadRow.id,
      email: normalizedEmail,
    });

    // aqui você faz o mesmo envio de e-mail de confirmação que já existia antes
    // (mantendo sua lógica atual de token/confirm)

    return jsonWithCors(origin, { ok: true, leadId: leadRow.id }, 201);
  } catch (error) {
    console.error("[POST /api/lead] unhandled error", error);
    return jsonWithCors(origin, { ok: false, error: "INTERNAL_ERROR" }, 500);
  }
}
