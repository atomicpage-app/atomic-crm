// src/app/api/admin/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import { env } from '@/env/server';
import { db } from '@/lib/db';

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

function toErrorMessage(err: unknown) {
  return err instanceof Error ? `[${err.name}] ${err.message}` : String(err);
}

// (Opcional) middleware simples por header (ajuste sua auth real)
function isAuthorized(req: Request) {
  // Exemplo tosco: exige x-cron-secret == CRON_SECRET OU ajuste para seu auth real
  const fromHeader = req.headers.get('x-cron-secret');
  return !!fromHeader && fromHeader === env.CRON_SECRET;
}

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = ctx?.params?.id;
  if (!id || typeof id !== 'string') return badRequest('missing id');

  try {
    // const { data, error } = await db.from('leads').select('*').eq('id', id).single();
    // if (error) throw error;
    // if (!data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

    return NextResponse.json({ ok: true, id /*, lead: data*/ }, { status: 200 });
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('GET /api/admin/leads/[id] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } }
) {
  if (!isAuthorized(req)) return unauthorized();

  const id = ctx?.params?.id;
  if (!id || typeof id !== 'string') return badRequest('missing id');

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid json body');
  }

  try {
    // const { error } = await db.from('leads').update(body).eq('id', id);
    // if (error) throw error;

    return NextResponse.json({ ok: true, id, updated: body }, { status: 200 });
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('PATCH /api/admin/leads/[id] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: { id: string } }
) {
  if (!isAuthorized(req)) return unauthorized();

  const id = ctx?.params?.id;
  if (!id || typeof id !== 'string') return badRequest('missing id');

  try {
    // const { error } = await db.from('leads').delete().eq('id', id);
    // if (error) throw error;

    return NextResponse.json({ ok: true, id, deleted: true }, { status: 200 });
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('DELETE /api/admin/leads/[id] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
