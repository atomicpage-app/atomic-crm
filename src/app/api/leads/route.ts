import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- Supabase (server-side, usando service role) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[/api/leads] Variáveis de ambiente do Supabase não configuradas corretamente."
  );
}

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// --- Helpers de resposta com CORS ---
function jsonResponse(body: any, init?: { status?: number }) {
  return new NextResponse(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// --- OPTIONS para preflight CORS ---
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Status válidos para filtro
const ALLOWED_STATUSES = new Set([
  "confirmed",
  "pending",
  "expired_with_phone",
  "expired",
]);

// Helper para parse seguro de inteiros
function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.floor(n);
}

// Calcula o summary com base apenas em q (ignora status)
async function getSummary(q: string) {
  if (!supabase) {
    throw new Error("Supabase não configurado");
  }

  // Base query
  let baseQuery = supabase
    .from("v_leads_with_status")
    .select("id, status", { count: "exact", head: false });

  if (q) {
    // Busca simples em name/email/phone
    const like = `%${q}%`;
    baseQuery = baseQuery.or(
      `name.ilike.${like},email.ilike.${like},phone.ilike.${like}`
    );
  }

  const { data, error } = await baseQuery;

  if (error) {
    console.error("[/api/leads] Erro ao calcular summary:", error);
    throw new Error("Erro ao calcular summary");
  }

  const summary = {
    total: 0,
    confirmed: 0,
    pending: 0,
    expired_with_phone: 0,
    expired: 0,
  };

  if (!data) {
    return summary;
  }

  for (const row of data as { status: string }[]) {
    summary.total += 1;
    if (row.status === "confirmed") summary.confirmed += 1;
    if (row.status === "pending") summary.pending += 1;
    if (row.status === "expired_with_phone") summary.expired_with_phone += 1;
    if (row.status === "expired") summary.expired += 1;
  }

  return summary;
}

// --- GET /api/leads?q=&status=&limit=&page= ---
export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return jsonResponse(
        { ok: false, error: "Supabase não configurado no servidor." },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100);
    const page = parsePositiveInt(searchParams.get("page"), 1);

    const offset = (page - 1) * limit;
    const from = offset;
    const to = offset + limit - 1;

    // Query base para listagem paginada
    let listQuery = supabase
      .from("v_leads_with_status")
      .select(
        `
        id,
        name,
        email,
        phone,
        source,
        confirmation_expires_at,
        confirmed_at,
        created_at,
        status
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      const like = `%${q}%`;
      listQuery = listQuery.or(
        `name.ilike.${like},email.ilike.${like},phone.ilike.${like}`
      );
    }

    if (status && ALLOWED_STATUSES.has(status)) {
      listQuery = listQuery.eq("status", status);
    }

    const [{ data: leads, error: listError, count }, summary] = await Promise.all(
      [listQuery, getSummary(q)]
    );

    if (listError) {
      console.error("[/api/leads] Erro ao listar leads:", listError);
      return jsonResponse(
        { ok: false, error: "Erro ao listar leads." },
        { status: 500 }
      );
    }

    const total = count ?? 0;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return jsonResponse({
      ok: true,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      leads: leads ?? [],
    });
  } catch (err) {
    console.error("[/api/leads] Erro inesperado:", err);
    return jsonResponse(
      { ok: false, error: "Erro interno ao listar leads." },
      { status: 500 }
    );
  }
}
