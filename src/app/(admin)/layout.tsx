import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions, isAllowedEmail } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    // Redireciono direto para o fluxo padrão do NextAuth para simplificar o fluxo protegido.
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/leads")}`);
  }

  if (!isAllowedEmail(session.user.email)) {
    // Se alguém sem permissão chegar aqui, forçamos o signout para encerrar a sessão.
    redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent("/")}`);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-slate-400">Área administrativa</span>
            <h1 className="text-lg font-semibold text-slate-900">Leads</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm text-slate-500">
            <Link className={cn("rounded-md px-3 py-1.5 transition hover:bg-slate-100", "font-medium text-slate-700")} href="/">
              Voltar ao site
            </Link>
            <Link
              className={cn(
                "rounded-md px-3 py-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600",
                "border border-slate-200"
              )}
              href="/api/auth/signout?callbackUrl=/"
            >
              Sair
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
