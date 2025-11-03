import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions, isAllowedEmail } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(4).max(32)
});

type Params = {
  params: { id: string };
};

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAllowedEmail(session.user.email)) {
    // Não propagamos detalhes de sessão para evitar pistas sobre contas.
    return null;
  }

  return session;
}

export async function PUT(request: Request, { params }: Params) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { id } = params;
  const { data, error } = await db
    .from("leads")
    .update({ name: parsed.data.name, phone: parsed.data.phone })
    .eq("id", id)
    .select("id, name, email, phone, created_at, confirmed_at")
    .maybeSingle();

  if (error) {
    console.error("Erro ao atualizar lead", error);
    return NextResponse.json({ error: "Falha ao atualizar lead" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await ensureAdmin();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = params;
  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir lead", error);
    return NextResponse.json({ error: "Falha ao excluir lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
