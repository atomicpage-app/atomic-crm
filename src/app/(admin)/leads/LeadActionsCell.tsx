"use client";

import { useState } from "react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
  confirmed_at?: string | null;
};

type LeadActionsCellProps = {
  lead: Lead;
  onResendSuccess?: () => void;
};

export function LeadActionsCell({ lead, onResendSuccess }: LeadActionsCellProps) {
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  const handleResend = async () => {
    setIsSending(true);
    setLastError(null);
    setLastSuccess(null);

    try {
      const res = await fetch("/api/lead/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: lead.id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        const message =
          data?.message ||
          "Não foi possível reenviar o e-mail de confirmação. Tente novamente.";
        setLastError(message);
        return;
      }

      setLastSuccess("E-mail de confirmação reenviado com sucesso.");
      if (onResendSuccess) onResendSuccess();
    } catch (e: any) {
      setLastError(
        e?.message ||
          "Ocorreu um erro ao tentar reenviar o e-mail de confirmação."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 items-start">
      <button
        type="button"
        onClick={handleResend}
        disabled={isSending || !!lead.confirmed_at}
        className="text-xs px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {lead.confirmed_at
          ? "Já confirmado"
          : isSending
          ? "Reenviando..."
          : "Reenviar e-mail"}
      </button>

      {lastError && (
        <span className="text-[10px] text-rose-600 max-w-[220px]">
          {lastError}
        </span>
      )}

      {lastSuccess && (
        <span className="text-[10px] text-emerald-600 max-w-[220px]">
          {lastSuccess}
        </span>
      )}
    </div>
  );
}
