// src/app/(admin)/leads/page.tsx
import { db } from "@/lib/db";
import { LeadsTable, type Lead } from "@/components/admin/leads-table";

/**
 * Carrega os leads a partir da view v_leads_with_status.
 * A view já contém a lógica de status (pending, confirmed, expired, etc.).
 */
async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await db
    .from("v_leads_with_status")
    .select("id, name, email, phone, created_at, confirmed_at, status")
    .order("created_at", { ascending: false });

  if (error) {
    // Em produção reportaríamos ao observability, aqui só registramos para debugging.
    console.error("Erro ao carregar leads", error);
    return [];
  }

  // Supabase tipa data como any; fazemos cast para o tipo Lead usado na tabela.
  return (data ?? []) as Lead[];
}

export default async function LeadsPage() {
  const leads = await fetchLeads();

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">
          Leads cadastrados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie os leads capturados pelo Atomic CRM. Aqui você pode
          visualizar os dados de contato, acompanhar o status de confirmação
          e aplicar ações administrativas como edição, exclusão ou reenvio
          de e-mail de confirmação (para leads pendentes).
        </p>
      </div>

      <LeadsTable leads={leads} />
    </section>
  );
}
