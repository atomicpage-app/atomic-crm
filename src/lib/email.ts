import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM!;
const APP_URL = process.env.APP_URL!;
type SendArgs = { name: string; email: string; token?: string };

export async function sendConfirmationEmail({ name, email, token }: Required<SendArgs>) {
  const confirmUrl = `${APP_URL}/api/confirm?token=${encodeURIComponent(token)}`;
  const html = `
    <p>Olá, ${name}!</p>
    <p>Confirme seu e-mail (expira em 1 hora):</p>
    <p><a href="${confirmUrl}">Confirmar meu cadastro</a></p>
    <p>Se você não solicitou, ignore esta mensagem.</p>
  `;
  const res = await resend.emails.send({ from: FROM, to: email, subject: "Confirme seu cadastro", html });
  if (process.env.NODE_ENV !== "production") console.log("Link de confirmação (dev):", confirmUrl);
  return res;
}

export async function sendWelcomeEmail({ name, email }: SendArgs) {
  const html = `<p>Olá, ${name}!</p><p>Seu cadastro foi confirmado com sucesso.</p>`;
  return resend.emails.send({ from: FROM, to: email, subject: "Cadastro confirmado", html });
}

export async function sendReminderEmail({ name, email, token }: Required<SendArgs>) {
  const confirmUrl = `${APP_URL}/api/confirm?token=${encodeURIComponent(token)}`;
  const html = `
    <p>Olá, ${name}!</p>
    <p>Falta apenas confirmar seu e-mail:</p>
    <p><a href="${confirmUrl}">Confirmar meu cadastro</a></p>
  `;
  return resend.emails.send({ from: FROM, to: email, subject: "Falta confirmar seu e-mail", html });
}
