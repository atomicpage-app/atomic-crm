import LeadsTablePage from "@/app/(admin)/leads/page";

type Lead = {
  id: string;
  status: string | null;
  created_at?: string | null;
};

async function fetchLeads(): Promise<Lead[]> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/leads`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[DASHBOARD] Erro ao buscar leads:", await res.text());
    throw new Error("Falha ao carregar leads.");
  }

  return res.json();
}

function countMetrics(leads: Lead[]) {
  const total = leads.length;

  const confirmed = leads.filter(
    (l) => l.status?.toLowerCase() === "confirmed"
  ).length;

  const pending = leads.filter(
    (l) => l.status?.toLowerCase() === "pending"
  ).length;

  const expired = leads.filter(
    (l) => l.status?.toLowerCase() === "expired"
  ).length;

  const confirmationRate = total > 0 ? (confirmed / total) * 100 : 0;

  return {
    total,
    confirmed,
    pending,
    expired,
    confirmationRate,
  };
}

export default async function LeadsDashboardWithMetrics() {
  const leads = await fetchLeads();
  const metrics = countMetrics(leads);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {/* HEADER */}
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            Atomic CRM
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">
            Leads • Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Métricas gerais e tabela consolidada dos leads capturados pela
            landing do Atomic Page.
          </p>
        </header>

        {/* METRICS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Total de Leads</p>
            <p className="mt-1 text-3xl font-bold text-slate-50">{metrics.total}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Confirmados</p>
            <p className="mt-1 text-3xl font-bold text-green-400">
              {metrics.confirmed}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Pendentes</p>
            <p className="mt-1 text-3xl font-bold text-yellow-400">
              {metrics.pending}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Expirados</p>
            <p className="mt-1 text-3xl font-bold text-red-400">
              {metrics.expired}
            </p>
          </div>
        </section>

        {/* CONFIRMATION RATE */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Taxa de Confirmação
          </p>
          <p className="mt-2 text-4xl font-bold text-sky-400">
            {metrics.confirmationRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Proporção de leads que confirmaram o e-mail.
          </p>
        </section>

        {/* TABLE (importando a página antiga como componente) */}
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
          <LeadsTablePage />
        </section>
      </div>
    </div>
  );
}
