# atomic-crm

API-first Next.js app para captura de leads com **double opt-in** usando **Supabase** e **Resend**.

## 📦 Requisitos
- Supabase com tabelas: `leads`, `leads_pending`, `email_events`
- Domínio verificado no Resend (SPF/DKIM)
- Node 18+

## ⚙️ Configuração local
1. Copie `.env.example` para `.env.local` e preencha:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (ex.: no-reply@seu-dominio.com)
   - `APP_URL` (http://localhost:3000 em dev)
2. Instale dependências:
   ```bash
   npm install
