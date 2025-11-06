// src/app/api/resend-confirmation/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/env/server';
import { sendConfirmationEmail } from '@/lib/email';

type LeadRow = {
  id: string;
  email: string;
  name: string | null;
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
    // 1) Buscar lead (somente colunas existentes no seu schema)
    const res = await db
      .from('leads')
      .select('id,email,name')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (res.error) throw res.error;

    const pending = (res.data ?? null) as Partial<LeadRow> | null;

    // 2) Gerar token (MVP; persistiremos abaixo)
    const token = crypto.randomUUID();

    const targetEmail = (pending?.email as string | undefined) ?? email;
    const targetName = (pending?.name as string | null | undefined) ?? '';
    const leadId = (pending?.id as string | undefined) ?? null;

    // 3) Persistir token em email_tokens (com ou sem lead_id)
    let tokenSaved = false;
    let tokenSaveError: unknown = null;

    // 3.1) Apaga tokens anteriores do mesmo lead (se houver) para type=confirm
    if (leadId) {
      const del = await db
        .from('email_tokens')
        .delete()
        .eq('lead_id', leadId)
        .eq('type', 'confirm');
      if (del.error) {
        console.error('[tokens] delete error:', serializeError(del.error));
      }
    }

    // 3.2) Insere o token novo
    const insPayload: Record<string, unknown> = { token, type: 'confirm' };
    if (leadId) insPayload.lead_id = leadId;

    const insTok = await db.from('email_tokens').insert(insPayload as any);
    if (insTok.error) {
      tokenSaveError = serializeError(insTok.error);
      console.error('[tokens] insert error:', tokenSaveError);
    } else {
      tokenSaved = true;
      console.log('[tokens] insert ok:', { leadId, hasLead: Boolean(leadId) });
    }

    // 4) Enviar e-mail
    await sendConfirmationEmail({
      name: targetName,
      email: targetEmail,
      token,
    });

    // 5) Log de evento (não-fatal)
    const emailEvent: EmailEventInsert = {
      email: targetEmail,
      type: 'resend_confirmation',
      meta: { route: 'resend-confirmation' },
    };
    const ins = await db.from('email_events').insert(emailEvent as any);
    if (ins.error) {
      console.error('[email_events] insert error:', serializeError(ins.error));
    }

    // 6) Diagnóstico: host do Supabase e leitura do token recém-inserido
    const supabaseHost = (() => {
      try { return new URL(process.env.SUPABASE_URL || '').host; } catch { return ''; }
    })();

    const check = await db
      .from('email_tokens')
      .select('id, lead_id, token, type, created_at, expires_at')
      .eq('token', token)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        email: targetEmail,
        leadId,
        token,
        tokenSaved,
        tokenSaveError,
        supabaseHost,
        justInserted: check.data ?? null,
        checkError: check.error ? serializeError(check.error) : null,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const payload = serializeError(err);
    console.error('POST /api/resend-confirmation error:', payload);
    return NextResponse.json({ ok: false, error: payload }, { status: 500 });
  }
}
