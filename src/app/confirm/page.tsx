"use client";

import { useEffect, useState } from "react";

type Status =
  | "idle"
  | "loading"
  | "success"
  | "expired"
  | "not_found"
  | "error";

export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string };
}) {
  const token = searchParams.token ?? "";
  const email = searchParams.email ?? "";

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Sem token → erro direto
    if (!token) {
      setStatus("error");
      setErrorMessage("Link de confirmação inválido ou incompleto.");
      return;
    }

    const run = async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams();
        params.set("token", token);
        if (email) params.set("email", email);

        const res = await fetch(`/api/confirm?${params.toString()}`, {
          method: "GET",
        });

        const data = await res.json();

        if (!data.ok) {
          if (data.error === "TOKEN_EXPIRED") {
            setStatus("expired");
          } else if (data.error === "TOKEN_NOT_FOUND") {
            setStatus("not_found");
          } else {
            setStatus("error");
            setErrorMessage("Ocorreu um erro ao confirmar seu cadastro.");
          }
          return;
        }

        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMessage("Ocorreu um erro inesperado. Tente novamente mais tarde.");
      }
    };

    run();
  }, [token, email]);

  const titleByStatus: Record<Status, string> = {
    idle: "Validando seu cadastro...",
    loading: "Validando seu cadastro...",
    success: "Cadastro confirmado com sucesso!",
    expired: "Link expirado",
    not_found: "Link inválido",
    error: "Não foi possível confirmar seu cadastro",
  };

  const subtitleByStatus: Record<Status, string> = {
    idle: "Aguarde um instante...",
    loading: "Aguarde um instante enquanto validamos suas informações.",
    success:
      "Seu e-mail foi confirmado e seus dados foram registrados no Atomic CRM. Você já pode seguir para o próximo passo.",
    expired:
      "Este link de confirmação não é mais válido. Solicite um novo cadastro para receber outro e-mail.",
    not_found:
      "Não encontramos um cadastro associado a este link. Verifique se você copiou o endereço corretamente ou solicite um novo e-mail.",
    error:
      "Alguma coisa saiu diferente do esperado. Tente novamente mais tarde ou entre em contato com o suporte.",
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-slate-50">
        <h1 className="text-2xl font-semibold mb-2">
          {titleByStatus[status]}
        </h1>
        <p className="text-sm text-slate-300 mb-6">
          {subtitleByStatus[status]}
        </p>

        {status === "loading" && (
          <p className="text-sm text-slate-400">Processando sua confirmação...</p>
        )}

        {status === "success" && (
          <div className="mt-4 text-sm text-emerald-300">
            <p>Obrigado por confirmar seu e-mail, {email || "empreendedor(a)"}.</p>
          </div>
        )}

        {status === "expired" && (
          <div className="mt-4 text-sm text-amber-300">
            <p>
              Para continuar, volte ao site e faça um novo cadastro para receber
              outro link de confirmação.
            </p>
          </div>
        )}

        {status === "not_found" && (
          <div className="mt-4 text-sm text-rose-300">
            <p>
              Verifique se você clicou no link mais recente recebido por e-mail
              ou solicite um novo cadastro.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 text-sm text-rose-300">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="mt-8 text-xs text-slate-500">
          <p>Atomic CRM · Confirmação de cadastro</p>
        </div>
      </div>
    </main>
  );
}
