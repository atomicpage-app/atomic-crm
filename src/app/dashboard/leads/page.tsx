import LeadsTable from "../../(admin)/leads/leads-table";

export default function LeadsDashboardPage() {
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
          <LeadsTable />
        </section>
      </div>
    </div>
  );
}