import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { generateToken } from "@/lib/token";
import { sendConfirmationEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const { data: pending } = await db
    .from("leads_pending")
    .select("id, name, email, phone")
    .eq("email", email)
    .maybeSingle();

  if (!pending) {
    // Garantimos resposta controlada para que o painel apresente feedback claro.
    return NextResponse.json({ error: "Nenhum cadastro pendente para este e-mail" }, { status: 404 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error: updateError } = await db
    .from("leads_pending")
    .update({ token, expires_at: expiresAt, reminder_sent: false })
    .eq("id", pending.id);

  if (updateError) {
    console.error("Erro ao atualizar token de confirmação", updateError);
    return NextResponse.json({ error: "Falha ao atualizar token" }, { status: 500 });
  }

  await sendConfirmationEmail({ name: pending.name, email: pending.email, token });
  await db.from("email_events").insert({
    email: pending.email,
    type: "confirmation_resent",
    meta: { route: "/api/resend-confirmation" }
  });

  return NextResponse.json({ status: "resent" });
}
