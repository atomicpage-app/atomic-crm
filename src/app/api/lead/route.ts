import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// --- Supabase (server-side, usando service role) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[/api/lead] Variáveis de ambiente do Supabase não configuradas corretamente."
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
      "Access-Control-Allow-Methods": "POST,OPTIONS",
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
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// --- POST /api/lead ---
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

    let { name, email, phone, source } = body as {
      name?: string;
      email?: string;
      phone?: string;
      source?: string;
    };

    // Normalizações
    name = (name ?? "").toString().trim() || null;
    email = (email ?? "").toString().trim().toLowerCase();
    phone = (phone ?? "").toString();
    source = (source ?? "").toString().trim() || null;

    if (!email) {
      return jsonResponse(
        { ok: false, error: "Email é obrigatório." },
        { status: 400 }
      );
    }

    // Limpa o telefone: mantém apenas dígitos
    const cleanedPhone = phone.replace(/\D/g, "");
    const phoneToSave = cleanedPhone.length > 0 ? cleanedPhone : null;

    // Token de confirmação (mantém o fluxo existente de confirmação por e-mail)
    const token = crypto.randomUUID();

    // Expiração em 24h (ajuste se já tiver outra convenção)
    const expiresInHours = 24;
    const confirmationExpiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000
    ).toISOString();

    // Insere o lead na tabela
    const { data, error } = await supabase
      .from("leads")
      .insert({
        name,
        email,
        phone: phoneToSave,
        source,
        token,
        confirmation_expires_at: confirmationExpiresAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[/api/lead] Erro ao inserir lead:", error);
      return jsonResponse(
        { ok: false, error: "Erro ao salvar lead." },
        { status: 500 }
      );
    }

    // Disparo de e-mail de confirmação
    // --------------------------------
    // Aqui assumo que você está usando Resend.
    // Se já tiver uma função utilitária de envio, você pode substituir esse bloco.
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_BASE_URL ||
      "https://atomic-crm-qnrb.vercel.app";

    const confirmUrl = `${appBaseUrl}/confirm?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM;

    if (!resendApiKey || !resendFrom) {
      console.warn(
        "[/api/lead] RESEND_API_KEY ou RESEND_FROM não configurados. E-mail de confirmação não será enviado."
      );
    } else {
      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);

      try {
        await resend.emails.send({
          from: resendFrom,
          to: email,
          subject: "Confirme seu cadastro no Atomic CRM",
          html: `
            <p>Olá${name ? `, ${name}` : ""}!</p>
            <p>Recebemos seu cadastro no <strong>Atomic CRM</strong>.</p>
            <p>Para confirmar seu cadastro, clique no botão abaixo:</p>
            <p>
              <a href="${confirmUrl}" style="
                display:inline-block;
                padding:12px 20px;
                background:#111827;
                color:#ffffff;
                text-decoration:none;
                border-radius:6px;
                font-weight:600;
              ">
                Confirmar cadastro
              </a>
            </p>
            <p>Ou copie e cole este link no navegador:</p>
            <p><a href="${confirmUrl}">${confirmUrl}</a></p>
          `,
        });
      } catch (err) {
        console.error("[/api/lead] Erro ao enviar e-mail de confirmação:", err);
        // Não consideramos erro fatal para o lead em si; apenas registramos.
      }
    }

    return jsonResponse({
      ok: true,
      leadId: data.id,
      email,
      name,
      phone: phoneToSave,
      source,
      confirmation_expires_at: confirmationExpiresAt,
    });
  } catch (err) {
    console.error("[/api/lead] Erro inesperado:", err);
    return jsonResponse(
      { ok: false, error: "Erro interno ao processar o lead." },
      { status: 500 }
    );
  }
}
