// src/app/api/confirm/route.ts
import { NextResponse } from 'next/server';
import { env } from '@/env/server';
import { db } from '@/lib/db';

// Util simples para converter erros em string
function toErrorMessage(err: unknown) {
  return err instanceof Error ? `[${err.name}] ${err.message}` : String(err);
}

/**
 * GET /api/confirm?token=...&email=...
 * Confirmação de cadastro/lead via token.
 *
 * Observação:
 * - Os acessos ao banco estão comentados para você plugar no seu schema real.
 * - O handler retorna JSON consistente e compila sem depender do schema.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token')?.trim();
    const email = url.searchParams.get('email')?.trim();

    if (!token || token.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'invalid or missing token' },
        { status: 400 }
      );
    }

    // (Opcional) validar email se quiser exigir
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'invalid email' },
        { status: 400 }
      );
    }

    // ===========================
    // 🔒 Exemplo de uso com Supabase (AJUSTE PARA SEU SCHEMA)
    // ===========================
    // const { data, error } = await db
    //   .from('leads')
    //   .select('id, email, status, confirm_token')
    //   .eq('confirm_token', token)
    //   .maybeSingle();
    //
    // if (error) throw error;
    // if (!data) {
    //   return NextResponse.json(
    //     { ok: false, error: 'token not found' },
    //     { status: 404 }
    //   );
    // }
    //
    // if (email && data.email !== email) {
    //   return NextResponse.json(
    //     { ok: false, error: 'token/email mismatch' },
    //     { status: 400 }
    //   );
    // }
    //
    // // Atualiza status para "confirmed" (ou o que for no seu domínio)
    // const { error: upErr } = await db
    //   .from('leads')
    //   .update({ status: 'confirmed', confirm_token: null })
    //   .eq('id', data.id);
    // if (upErr) throw upErr;
    //
    // const confirmedId = data.id;

    // Para MVP sem schema definido aqui, retornamos no-op seguro:
    const confirmedId = null as unknown as string | null;

    // Se quiser redirecionar para uma página de sucesso, pode usar:
    // return NextResponse.redirect(`${env.APP_URL}/confirm/success`, 302);

    return NextResponse.json(
      {
        ok: true,
        action: 'confirm',
        token,
        email: email ?? null,
        confirmedId, // será o id real quando plugar o update acima
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('GET /api/confirm error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * (Opcional) POST /api/confirm
 * Caso você deseje confirmar via corpo (JSON) em vez de querystring:
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid json body' }, { status: 400 });
    }

    const token = (body as Record<string, unknown>)?.token;
    const email = (body as Record<string, unknown>)?.email;

    if (typeof token !== 'string' || token.trim().length < 8) {
      return NextResponse.json(
        { ok: false, error: 'invalid or missing token' },
        { status: 400 }
      );
    }

    if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });
    }

    // ===========================
    // 🔒 Exemplo de uso com Supabase (AJUSTE PARA SEU SCHEMA)
    // ===========================
    // const { data, error } = await db
    //   .from('leads')
    //   .select('id, email, status, confirm_token')
    //   .eq('confirm_token', token)
    //   .maybeSingle();
    //
    // if (error) throw error;
    // if (!data) return NextResponse.json({ ok: false, error: 'token not found' }, { status: 404 });
    // if (email && data.email !== email) {
    //   return NextResponse.json({ ok: false, error: 'token/email mismatch' }, { status: 400 });
    // }
    // const { error: upErr } = await db
    //   .from('leads')
    //   .update({ status: 'confirmed', confirm_token: null })
    //   .eq('id', data.id);
    // if (upErr) throw upErr;
    //
    // const confirmedId = data.id;

    const confirmedId = null as unknown as string | null;

    return NextResponse.json(
      {
        ok: true,
        action: 'confirm',
        token,
        email: email ?? null,
        confirmedId,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = toErrorMessage(err);
    console.error('POST /api/confirm error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
