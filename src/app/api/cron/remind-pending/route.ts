// src/app/api/cron/remind-pending/route.ts
import { env } from '@/env/server';
import { db } from '@/lib/db';

/**
 * Valida o segredo vindo do header x-cron-secret OU via query (?secret=...).
 * Retorna null se válido; uma Response com erro se inválido.
 */
function validateSecret(req: Request): Response | null {
  const url = new URL(req.url);
  const fromHeader = req.headers.get('x-cron-secret');
  const fromQuery = url.searchParams.get('secret');
  const provided = fromHeader ?? fromQuery ?? '';

  if (!provided || provided !== env.CRON_SECRET) {
    return new Response(
      JSON.stringify({ ok: false, error: 'unauthorized: invalid or missing CRON_SECRET' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }
  return null;
}

/**
 * GET: healthcheck / teste rápido
 * Útil para testar permissão/segredo sem executar a rotina completa.
 */
export async function GET(req: Request) {
  const errResp = validateSecret(req);
  if (errResp) return errResp;

  return new Response(
    JSON.stringify({ ok: true, route: 'remind-pending', mode: 'healthcheck' }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

/**
 * POST: execução real da rotina de "remind pending".
 * Ajuste o bloco de negócio conforme sua tabela/estado.
 */
export async function POST(req: Request) {
  const errResp = validateSecret(req);
  if (errResp) return errResp;

  try {
    // -------------------------------
    // Exemplo de leitura de itens pendentes (AJUSTE para seu schema)
    // Observação: 'db' é server-only (usa SUPABASE_SERVICE_ROLE_KEY com segurança)
    // -------------------------------
    // const { data, error } = await db
    //   .from('leads')
    //   .select('id,email,status,updated_at')
    //   .eq('status', 'pending')
    //   .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // >24h

    // if (error) {
    //   throw error; // será tratado no catch com narrowing
    // }

    // // Exemplo de “envio de lembrete” (substitua pela sua função real)
    // for (const lead of data ?? []) {
    //   // await sendReminderEmail(lead.email, ...);
    // }

    // // Opcional: marcar lembretes enviados, atualizar status, etc.
    // const processed = (data ?? []).map(d => d.id);

    // Para MVP sem schema definido aqui, retornamos no-op seguro:
    const processed: string[] = [];

    return new Response(
      JSON.stringify({
        ok: true,
        route: 'remind-pending',
        processedCount: processed.length,
        processedIds: processed
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: unknown) {
    // ✅ Narrowing seguro — corrige o erro “Property 'name' does not exist on type 'never'”
    const message =
      err instanceof Error
        ? `[${err.name}] ${err.message}`
        : typeof err === 'string'
          ? err
          : JSON.stringify(err);

    // Log no servidor
    console.error('remind-pending error:', message);

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
