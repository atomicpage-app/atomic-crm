// src/app/dev/lead-test/page.tsx

import LeadTestForm from "./LeadTestForm";

export const metadata = {
  title: "Teste de captura de lead | Atomic CRM",
};

export default function LeadTestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Teste de Captura de Lead
        </h1>
        <p className="text-sm text-slate-600">
          Este formulário envia um POST para <code>/api/lead</code> com os
          campos <strong>name</strong>, <strong>email</strong>,{" "}
          <strong>phone</strong> e <strong>source</strong>.
        </p>

        <LeadTestForm />
      </div>
    </main>
  );
}
