import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_ORIGINS = [
  'https://atomicpage.com.br',
  'https://www.atomicpage.com.br',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
];

function buildCorsHeaders(origin: string | null): HeadersInit {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  const resolvedOrigin = isAllowed ? origin! : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin'
  };
}

type LeadInsertPayload = {
  name: string;
  email: string;
  phone: string;
};

function sanitizeLeadPayload(body: any): LeadInsertPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('INVALID_BODY');
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();

  if (!name || !email || !phone) {
    throw new Error('MISSING_REQUIRED_FIELDS');
  }

  return { name, email, phone };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return new Response(
        JSON.stringify({ ok: false, error: 'INVALID_JSON' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const payload = sanitizeLeadPayload(body);

    const { data: existing, error: selectError } = await supabase
      .from('leads')
      .select('id, confirmed_at')
      .eq('email', payload.email)
      .maybeSingle();

    if (selectError) {
      console.error('Supabase select error on /api/lead', selectError);
    }

    if (existing && existing.confirmed_at) {
      return new Response(
        JSON.stringify({ ok: false, error: 'LEAD_ALREADY_CONFIRMED' }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    let dbResult;

    if (existing) {
      dbResult = await supabase
        .from('leads')
        .update({
          name: payload.name,
          phone: payload.phone
        })
        .eq('id', existing.id)
        .select('id')
        .single();
    } else {
      dbResult = await supabase
        .from('leads')
        .insert({
          name: payload.name,
          email: payload.email,
          phone: payload.phone
        })
        .select('id')
        .single();
    }

    const { data, error } = dbResult;

    if (error || !data) {
      console.error('Supabase insert/update error on /api/lead', error);
      return new Response(
        JSON.stringify({ ok: false, error: 'DB_SAVE_ERROR' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        leadId: data.id
      }),
      {
        status: existing ? 200 : 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err: any) {
    console.error('Unexpected error in /api/lead POST', err);

    let errorCode = 'UNEXPECTED_ERROR';
    let status = 500;

    if (err instanceof Error) {
      if (err.message === 'MISSING_REQUIRED_FIELDS') {
        errorCode = 'MISSING_REQUIRED_FIELDS';
        status = 400;
      } else if (err.message === 'INVALID_BODY') {
        errorCode = 'INVALID_BODY';
        status = 400;
      }
    }

    return new Response(
      JSON.stringify({ ok: false, error: errorCode }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? '100');

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase error on /api/lead GET', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'DB_FETCH_ERROR' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      leads: data
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}
