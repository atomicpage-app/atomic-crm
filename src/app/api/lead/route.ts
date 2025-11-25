// src/app/api/lead/resend-confirmation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  sendLeadConfirmationEmail,
} from "@/lib/email/sendLeadConfirmationEmail";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[/api/lead/resend-confirmation] Variáveis de ambiente do Supabase não configuradas corretamente."
  );
}

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
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
          error: "Informe ao menos email ou leadId.",
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
        },
        { status: 404 }
      );
    }

    // Se já confirmado, não faz sentido reenviar
    if (lead.confirmation_confirmed_at || lead.confirmed_at) {
      return jsonResponse(
        {
          ok: false,
          error: "LEAD_ALREADY_CONFIRMED",
        },
        { status: 400 }
      );
    }

    const newToken = crypto.randomUUID();
    const expiresInHours = 24;
    const newExpiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000
    ).toISOString();

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        confirmation_token: newToken,
        confirmation_expires_at: newExpiresAt,
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
          error: "Erro ao atualizar dados de confirmação.",
        },
        { status: 500 }
      );
    }

    const emailResult = await sendLeadConfirmationEmail({
      email: lead.email,
      name: lead.name,
      token: newToken,
    });

    return jsonResponse({
      ok: true,
      leadId: lead.id,
      email: lead.email,
      name: lead.name,
      confirmation_expires_at: newExpiresAt,
      emailStatus: emailResult.status,
      emailError: emailResult.error,
    });
  } catch (err) {
    console.error(
      "[/api/lead/resend-confirmation] Erro inesperado:",
      err
    );
    return jsonResponse(
      { ok: false, error: "Erro interno ao reenviar confirmação." },
      { status: 500 }
    );
  }
}
