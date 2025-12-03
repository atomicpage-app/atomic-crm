"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LeadStatus = "pending" | "confirmed" | "expired" | string;

export type LeadActionsCellProps = {
  lead: {
    id: string;
    name?: string | null;
    email: string;
    status: LeadStatus;
    createdAt?: string | null;
  };
};

export default function LeadActionsCell({ lead }: LeadActionsCellProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loading = isDeleting || isResending || isPending;

  // Regra de unificação:
  // - Reenvio só é permitido se o lead NÃO estiver confirmado
  //   (ajuste aqui se seu status for diferente de "confirmed").
  const canResend =
    lead.status !== "confirmed" && lead.email && lead.email.trim().length > 0;

  async function handleResend() {
    if (!canResend) {
      return;
    }

    if (
      !window.confirm(
        "Reenviar o e-mail de confirmação para este lead? Isso irá gerar um novo link de confirmação."
      )
    ) {
      return;
    }

    try {
      setIsResending(true);

      const response = await fetch("/api/lead/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: lead.id,
          email: lead.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || data.message)) ||
          "Falha ao reenviar o e-mail de confirmação.";
        throw new Error(message);
      }

      alert("E-mail de confirmação reenviado com sucesso.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao reenviar o e-mail de confirmação."
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);

      // ATENÇÃO: este path assume rota DELETE em /api/leads/[id].
      // Se sua API estiver diferente (ex.: /api/lead/[id]), ajuste aqui.
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          (data && (data.error || data.message)) ||
          "Falha ao excluir o lead.";
        throw new Error(message);
      }

      alert("Lead excluído com sucesso.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao excluir o lead."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={!canResend || loading}
        className="rounded-md border border-sky-500 px-2 py-1 text-xs font-medium text-sky-500 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
      >
        {isResending || isPending ? "Reenviando..." : "Reenviar e-mail"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-md border border-red-500 px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
      >
        {isDeleting || isPending ? "Excluindo..." : "Excluir"}
      </button>
    </div>
  );
}
