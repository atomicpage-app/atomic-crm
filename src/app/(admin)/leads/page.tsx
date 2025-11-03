import { db } from "@/lib/db";
import { LeadsTable, type Lead } from "@/components/admin/leads-table";

async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await db
    .from("leads")
    .select("id, name, email, phone, created_at, confirmed_at")
    .order("created_at", { ascending: false });

  if (error) {
    // Em produção reportaríamos ao observability, aqui só registramos para debugging.
    console.error("Erro ao carregar leads", error);
    return [];
  }

  return data ?? [];
}

export default async function LeadsPage() {
  const leads = await fetchLeads();

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Leads confirmados</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie os cadastros confirmados. Você pode editar dados de contato, remover um lead ou reenviar a confirmação
          de e-mail quando necessário.
        </p>
      </div>
      <LeadsTable leads={leads} />
    </section>
  );
}
