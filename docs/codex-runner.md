# Codex Runner — atomic-crm

## Propósito
Documento que centraliza as instruções e tarefas que o Codex deve executar, uma por vez, de forma sequencial e rastreável.

## Modo de uso
- Use o comando “Execute tarefa X do runner”.
- O Codex deve:
  - Criar arquivos conforme descrito.
  - Confirmar após cada commit.
  - Manter comentários curtos nos arquivos sobre decisões técnicas.

---

## Tarefa 1 — Criar Admin CRUD básico (Leads)
**Objetivo:** criar área administrativa protegida (para você, Jairo) com autenticação Google (whitelist) e CRUD de leads.

### Requisitos
- Path: `src/app/(admin)/leads`
- Autenticação via **NextAuth.js** com provider Google
- E-mail whitelisted: `jairo@atomicpage.com.br`
- Listar leads (tabela com nome, email, telefone, created_at, confirmed_at)
- Ações:
  - Editar (inline ou modal)
  - Excluir
  - Reenviar e-mail de confirmação (chama `/api/resend-confirmation`)
- Layout simples com Tailwind + shadcn/ui

### Observações
- Usar Supabase SDK com `SUPABASE_SERVICE_ROLE_KEY`
- Colocar componentes auxiliares em `src/components/admin/`
- Garantir checagem de autenticação no layout `(admin)`
- Commit message: `feat(admin): basic authenticated CRUD for leads`

---

## Tarefa 2 — Job de lembrete (1h)
(Reenvia confirmação se `reminder_sent=false` e dentro do prazo)

## Tarefa 3 — Job de limpeza (24h)
(Remove `leads_pending` expirados)

## Tarefa 4 — Webhook Resend
(Registrar eventos reais em `email_events`)

## Tarefa 5 — Deploy e envs na Vercel
