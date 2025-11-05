// src/app/api/resend-confirmation/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/env/server';
import { sendConfirmationEmail } from '@/lib/email';

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

function serializeError(err: unknown) {
  if (err instanceof Error) {
    const base: any = { name: err.name, message: err.message };
    for (const k of Object.keys(err as any)) base[k] = (err as any)[k];
    return base;
  }
  if (typeof err === 'object' && err) {
    try { return JSON.parse(JSON.stringify(err)); } catch { return { raw: String(err) }; }
  }
  return { raw: String(err) };
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret') ?? req.headers.get('x-cron-secret');
  if (!secret || secret !== env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, route: 'resend-confirmation', mode: 'healthcheck' });
}

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
    // 1) Buscar lead (sem genéricos para evitar unions estranhos)
    const res = await db
      .from('leads')
      .select('id,email,name,status,confirm_token')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (res.error) throw res.error;

    // ✅ Força um tipo flexível em vez de 'never'
    const pending = (res.data ?? null) as Partial<LeadRow> | null;

    // 2) Derivar campos de forma segura
    const token =
      (pending?.confirm_token as string | null | undefined) ?? crypto.randomUUID();

    const targetEmail = (pending?.email as string | undefined) ?? email;
    const targetName = (pending?.name as string | null | undefined) ?? '';
    const leadId = (pending?.id as string | undefined) ?? null;

    // (Opcional) persistir o token quando não existir:
    // if (leadId && !pending?.confirm_token) {
    //   const up = await db.from('leads').update({ confirm_token: token }).eq('id', leadId);
    //   if (up.error) console.error('token update error:', serializeError(up.error));
    // }

    // 3) Enviar e-mail
    await sendConfirmationEmail({
      name: targetName,
      email: targetEmail,
      token,
    });

    // 4) Log de evento (não-fatal se a tabela não existir)
    const emailEvent: EmailEventInsert = {
      email: targetEmail,
      type: 'resend_confirmation',
      meta: { route: 'resend-confirmation' },
    };
    const ins = await db.from('email_events').insert(emailEvent as any);
    if (ins.error) {
      console.error('email_events insert error:', serializeError(ins.error));
      // segue sem lançar
    }

    return NextResponse.json(
      { ok: true, email: targetEmail, leadId, token },
      { status: 200 }
    );
  } catch (err: unknown) {
    const payload = serializeError(err);
    console.error('POST /api/resend-confirmation error:', payload);
    return NextResponse.json({ ok: false, error: payload }, { status: 500 });
  }
}
