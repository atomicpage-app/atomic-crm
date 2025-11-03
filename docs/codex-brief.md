# atomic-crm — Codex Brief

## Objetivo
Mini CRM de leads via **double opt-in**:
- Receber form (name, email, phone) via POST /api/lead
- Evitar duplicidade por email/telefone
- Enviar email de confirmação (Resend)
- Confirmar via /api/confirm?token=...
- Após confirmar: enviar welcome email + armazenar em `leads`
- Painel CRUD admin (próximas etapas)
- Reenvio de confirmação (1h), limpeza de pendentes (24h)

## Stack atual
- Next.js 14 (App Router, TS)
- Supabase (server-side com Service Role)
- Resend (domínio verificado)
- Vercel (deploy depois)
- .env.local local funcionando

## Estado atual
- Rotas: `/api/lead`, `/api/confirm`, `/confirm/success`
- Env OK (verificado por `/api/debug/env`)
- Tabelas OK: `leads`, `leads_pending`, `email_events`
- Fluxo E2E validado localmente

## Variáveis de ambiente (referência)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- EMAIL_FROM
- APP_URL

## Roadmap próximo (em ordem)
1) **Admin básico (CRUD Leads)**: rota protegida com NextAuth (Google whitelist), listar/buscar/editar/excluir leads; ação manual de reenviar confirmação.
2) **Job de lembrete (1h)**: reenvio de confirmação se `reminder_sent=false` e dentro do prazo; marcar `reminder_sent=true`.
3) **Job de limpeza (24h)**: deletar `leads_pending` expirados.
4) **Webhook Resend** (opcional): gravar eventos reais em `email_events`.
5) **CORS & Form**: se a landing estiver em outro domínio, habilitar CORS em `/api/lead`.
6) **Deploy Vercel**: configurar envs e publicar.

## Diretrizes para o Codex
- Commits pequenos e descritivos.
- Preferir “commit directly to main” (a menos que o PR seja necessário).
- Pedir confirmação antes de alterar arquivos sensíveis.
- Criar arquivos em `src/app/(admin)` para área administrativa.
- Código TypeScript estrito e checagens de erros com mensagens claras.
- Manter SQL e migrações de Supabase em `supabase/sql` (se necessário).
- Incluir breves notas de uso em README quando adicionar rotas/telas.
