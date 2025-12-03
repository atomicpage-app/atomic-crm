import LeadActionsCell from "@/app/(admin)/leads/LeadActionsCell";

type RawLead = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

type LeadWithNormalizedFields = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string | null;
};

async function fetchLeads(): Promise<LeadWithNormalizedFields[]> {
  const baseUrl = process.env.NEXTAUTH_URL;
  const url = baseUrl
    ? `${baseUrl}/api/leads`
    : "http://localhost:3000/api/leads";

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[DASHBOARD_LEADS] Falha ao buscar leads", await response.text());
    throw new Error("Falha ao carregar leads para o dashboard.");
  }

  const data = (await response.json()) as RawLead[];

  return data.map((lead) => ({
    id: lead.id,
    name: lead.name ?? null,
    email: lead.email,
    phone: lead.phone ?? null,
    status: (lead.status ?? "pending").toLowerCase(),
    createdAt: lead.created_at ?? lead.createdAt ?? null,
  }));
}

function formatStatus(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "confirmed") return "Confirmado";
  if (normalized === "pending") return "Pendente";
  if (normalized === "expired") return "Expirado";
  return status;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export default async function LeadsDashboardPage() {
  const leads = await fetchLeads();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            Atomic CRM
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">
            Leads • Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Visão consolidada dos leads capturados pela landing do Atomic Page.
            Use as ações para reenviar o e-mail de confirmação ou excluir
            registros obsoletos.
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="sticky top-0 border-b border-slate-800 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Nome
                  </th>
                  <th className="sticky top-0 border-b border-slate-800 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    E-mail
                  </th>
                  <th className="sticky top-0 border-b border-slate-800 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Telefone
                  </th>
                  <th className="sticky top-0 border-b border-slate-800 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                  <th className="sticky top-0 border-b border-slate-800 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Criado em
                  </th>
                  <th className="sticky top-0 border-b border-slate-800 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-sm text-slate-400"
                    >
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-t border-slate-800 hover:bg-slate-900/80"
                    >
                      <td className="px-3 py-2 align-middle text-sm text-slate-50">
                        {lead.name || "-"}
                      </td>
                      <td className="px-3 py-2 align-middle text-sm text-slate-200">
                        {lead.email}
                      </td>
                      <td className="px-3 py-2 align-middle text-sm text-slate-300">
                        {lead.phone || "-"}
                      </td>
                      <td className="px-3 py-2 align-middle text-sm">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200">
                          {formatStatus(lead.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-400">
                        {formatDateTime(lead.createdAt)}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex justify-end">
                          <LeadActionsCell
                            lead={{
                              id: lead.id,
                              name: lead.name,
                              email: lead.email,
                              status: lead.status,
                              createdAt: lead.createdAt,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

