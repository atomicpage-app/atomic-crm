// src/app/(admin)/admin/leads/LeadActionsCell.tsx
"use client";

import { useState } from "react";

type LeadStatus = "pending" | "confirmed" | "expired" | "none";

type Props = {
  leadId: string;
  email: string;
  status: LeadStatus;
};

export function LeadActionsCell({ leadId, email, status }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canResend = status === "pending";

  async function handleResend() {
    setMessage(null);
    setError(null);

    if (!canResend) {
      setError("Só é possível reenviar para leads pendentes.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lead/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        if (data?.error === "LEAD_ALREADY_CONFIRMED") {
          setError("Este lead já está confirmado.");
        } else if (data?.error === "LEAD_NOT_FOUND") {
          setError("Lead não encontrado.");
        } else {
          setError(
            data?.error ||
              "Não foi possível reenviar o e-mail de confirmação."
          );
        }
        return;
      }

      if (data.emailStatus === "sent") {
        setMessage(
          `E-mail de confirmação reenviado para "${data.email ?? email}".`
        );
      } else if (data.emailStatus === "not_configured") {
        setMessage(
          "Lead atualizado, mas o envio de e-mail não foi configurado no backend."
        );
      } else if (data.emailStatus === "failed") {
        setError(
          `Erro ao enviar o e-mail: ${
            data.emailError?.message ?? "falha desconhecida."
          }`
        );
      } else {
        setMessage("Operação concluída, verifique os logs para mais detalhes.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao reenviar confirmação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <button
        type="button"
        onClick={handleResend}
        disabled={!canResend || loading}
        className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium border ${
          canResend
            ? "bg-slate-900 text-slate-50 border-slate-700 hover:bg-slate-800"
            : "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed"
        } disabled:opacity-60`}
      >
        {loading ? "Reenviando..." : "Reenviar confirmação"}
      </button>

      {message && (
        <p className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-1">
          {message}
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}
