// src/app/api/resend-confirmation/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/env/server';
import { sendConfirmationEmail } from '@/lib/email';

// Tipos locais mínimos para validar o que precisamos
type LeadRow = {
  id: string;
  email: string;
  name?: string | null;
  status?: string | null;
  confirm_token?: string | null;
};

type EmailEventInsert = {
  email: string;
  type: string;
  meta?: Record<string, unknown>;
};

function toErrorMessage(err: unknown) {
  return err instanceof Error ? `[${err.name}] ${err.message}` : String(err);
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

// Type guard: valida em runtime que o objeto tem a forma de LeadRow
function isLeadRow(x: any): x is LeadRow {
  return (
    x &&
    typeof x === 'object' &&
    typeof x.id === 'string' &&
    typeof x.email === 'string'
  );
}

/**
 * GET: healthcheck simples
 */
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  if (!secret || secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, route: 'resend-confirmation', mode: 'healthcheck' });
}

/**
 * POST: reenvia e-mail de confirmação para um lead pelo e-mail.
 * Body: { "email": "exemplo@dominio.com" }
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  if (!secret || secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid json body');
  }

  const email = (body as Record<string, unknown>)?.email;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('invalid or missing email');
  }

  try {
    // 1) Buscar lead pelo e-mail (sem genéricos do Supabase para evitar unions estranhos)
    const res = await db
      .from('leads')
      .select('id,email,name,status,confirm_token')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (res.error) throw res.error;
    if (!res.data) {
      return NextResponse.json({ ok: false, error: 'lead not found' }, { status: 404 });
    }

    // Validar em runtime que tem o shape que precisamos
    if (!isLeadRow(res.data)) {
      // Se o schema mudou, preferimos um erro claro do que retornar dados ruins
      return NextResponse.json(
        { ok: false, error: 'lead shape mismatch' },
        { status: 500 }
      );
    }

    const pending: LeadRow = res.data;

    // 2) Garantir token
    const token = pending.confirm_token ?? crypto.randomUUID();

    // (opcional) persistir token se não existir
    // if (!pending.confirm_token) {
    //   const up = await db.from('leads').update({ confirm_token: token }).eq('id', pending.id);
    //   if (up.error) throw up.error;
    // }

    // 3) Enviar e-mail de confirmação
    await sendConfirmationEmail({
      name: pending.name ?? '',
      email: pending.email,
      token,
    });

    // 4) Registrar evento de e-mail
    // Sem tipos gerados do Supabase, evitamos genéricos e usamos um cast leve.
    const emailEvent: EmailEventInsert = {
      email: pending.email,
      type: 'resend_confirmation',
      meta: { route: 'resend-confirmation' },
    };
    const ins = await db.from('email_events').insert(emailEvent as any);
    if (ins.error) throw ins.error;

    return NextResponse.json(
      { ok: true, email: pending.email, leadId: pending.id, token },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('POST /api/resend-confirmation error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
