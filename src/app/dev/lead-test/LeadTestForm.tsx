// src/app/dev/lead-test/LeadTestForm.tsx
"use client";

import { FormEvent, useState } from "react";

type CreateLeadPayload = {
  name: string;
  email: string;
  phone: string;
  source: string;
};

type CreateLeadResponse = {
  ok: boolean;
  leadId?: string;
  email?: string;
  name?: string | null;
  phone?: string | null;
  source?: string | null;
  confirmation_expires_at?: string;
  error?: string;
  supabaseError?: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
};

export default function LeadTestForm() {
  const [form, setForm] = useState<CreateLeadPayload>({
    name: "",
    email: "",
    phone: "",
    source: "dev-lead-test", // origem default
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!form.name.trim() || !form.email.trim()) {
      setErrorMessage("Nome e e-mail são obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      let data: CreateLeadResponse | null = null;
      try {
        data = (await res.json()) as CreateLeadResponse;
      } catch {
        // se não vier JSON válido, tratamos só por status
      }

      if (!res.ok || !data?.ok) {
        console.error("Erro ao criar lead:", data);

        const apiError = data?.error;
        const supa = data?.supabaseError;

        if (supa) {
          // Exibe o erro detalhado do Supabase
          const parts = [
            "Erro no Supabase ao salvar o lead.",
            supa.message && `message: ${supa.message}`,
            supa.details && `details: ${supa.details}`,
            supa.hint && `hint: ${supa.hint}`,
            supa.code && `code: ${supa.code}`,
          ].filter(Boolean);

          setErrorMessage(parts.join(" | "));
        } else if (apiError === "Email é obrigatório.") {
          setErrorMessage("A API recusou a requisição: e-mail é obrigatório.");
        } else {
          setErrorMessage(
            apiError ||
              "Não foi possível cadastrar o lead. Verifique os logs da API."
          );
        }

        return;
      }

      const email = data.email ?? form.email;

      setSuccessMessage(
        `Lead cadastrado com sucesso! Se o envio de e-mail estiver configurado, "${email}" deve receber o link de confirmação em instantes.`
      );

      // limpa campos principais, mantém a source
      setForm((prev) => ({
        ...prev,
        name: "",
        email: "",
        phone: "",
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage("Erro de rede ao enviar o lead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Nome *
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nome completo"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          E-mail *
        </label>
        <input
          type="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="seu@email.com"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Telefone
        </label>
        <input
          type="tel"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="(11) 99999-9999"
        />
        <p className="text-xs text-slate-500">
          O backend vai salvar apenas os dígitos (ex.: 11999998888).
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Origem (source)
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          placeholder="ex.: atomicpage-hero, campanha-x, dev-lead-test"
        />
        <p className="text-xs text-slate-500">
          Campo apenas informativo para rastrear de onde veio o lead.
        </p>
      </div>

      {errorMessage && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar lead de teste"}
      </button>

      <p className="text-[11px] text-slate-400">
        Esta página é apenas para teste interno. Não compartilhe o link em
        produção.
      </p>
    </form>
  );
}
