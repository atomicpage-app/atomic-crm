# 🧰 Troubleshooting Guide — Atomic CRM

## 🔍 1. Verificar variáveis de ambiente
- Acesse: [http://localhost:3000/api/debug/env](http://localhost:3000/api/debug/env)
- Todas devem retornar `true` em `present`.
- Se `ADMIN_EMAILS` ou `ADMIN_EMAIL` estiverem `false`, crie ou edite `.env.local` e adicione:
