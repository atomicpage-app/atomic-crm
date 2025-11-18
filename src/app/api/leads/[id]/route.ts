// app/api/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validação básica de UUID v4
function isValidUuid(id: string) {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(id);
}

export async function DELETE(
  _req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params ?? {};

  // 1. Validação de ID
  if (!id || !isValidUuid(id)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid lead id',
        code: 'INVALID_ID',
      },
      { status: 400 }
    );
  }

  // 2. Checagem de envs
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  // 3. Cliente Supabase (service role)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 4. Operação de delete
    const { error, count } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json(
        {
          ok: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }

    // Não encontrou lead
    if (!count || count === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Lead not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // 5. Sucesso
    return NextResponse.json(
      {
        ok: true,
        deletedId: id,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error deleting lead:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
