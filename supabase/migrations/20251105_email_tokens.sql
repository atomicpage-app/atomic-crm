-- Tabela: public.email_tokens
create table if not exists public.email_tokens (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  token text not null unique,
  type text not null default 'confirm',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);

-- Índices
create index if not exists email_tokens_token_idx on public.email_tokens(token);
create index if not exists email_tokens_lead_idx on public.email_tokens(lead_id);

-- RLS
alter table public.email_tokens enable row level security;

-- Política “bloqueia tudo” (apenas service role usa via API server-side)
drop policy if exists "email_tokens_block_all" on public.email_tokens;
create policy "email_tokens_block_all" on public.email_tokens for all using (false) with check (false);

-- (Opcional, recomendado)
-- Garante 1 token “confirm” ativo por lead (permite null lead_id)
-- create unique index if not exists email_tokens_unique_lead_type
-- on public.email_tokens(lead_id, type)
-- where lead_id is not null and type = 'confirm';
