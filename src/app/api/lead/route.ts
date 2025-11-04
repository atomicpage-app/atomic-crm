// src/app/api/lead/route.ts
import { NextResponse } from 'next/server';
import { env } from '@/env/server';
import { db } from '@/lib/db';

function toErrorMessage(err: unknown) {
  return err instanceof Error ? `[${err.name}] ${err.message}` : String(err);
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 20;

    // ===========================
    // Exemplo com Supabase (AJUSTE PARA SEU SCHEMA) — COMENTADO
    // ===========================
    // let query = db.from('leads').select('*').limit(safeLimit).order('created_at', { ascending: false });
    // if (q) {
    //   query = query.ilike('email', `%${q}%`);
    // }
    // const { data, error } = await query;
    // if (error) throw error;

    // Para não travar typecheck sem schema:
    const data: Array<Record<string, unknown>> = [];

    return NextResponse.json({ ok: true, q, limit: safeLimit, leads: data }, { status: 200 });
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('GET /api/lead error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('invalid json body');
    }

    const payload = body as Record<string, unknown>;
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest('invalid or missing email');
    }

    // ===========================
    // Exemplo com Supabase (AJUSTE PARA SEU SCHEMA) — COMENTADO
    // ===========================
    // const { data, error } = await db
    //   .from('leads')
    //   .insert([{ name, email, message, phone }])
    //   .select('id')
    //   .single();
    // if (error) throw error;
    // const createdId = data.id as string;

    const createdId = null as unknown as string | null;

    return NextResponse.json(
      { ok: true, createdId, lead: { name, email, message, phone } },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('POST /api/lead error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
