// src/lib/email/sendLeadConfirmationEmail.ts
import { Resend } from "resend";

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  "https://atomic-crm-qnrb.vercel.app";

export type EmailStatus = "not_configured" | "sent" | "failed";

export type SendLeadConfirmationResult = {
  status: EmailStatus;
  error: { message?: string; name?: string } | null;
};

type Params = {
  email: string;
  name?: string | null;
  token: string;
};

export async function sendLeadConfirmationEmail(
  params: Params
): Promise<SendLeadConfirmationResult> {
  const { email, name, token } = params;

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || process.env.EMAIL_FROM;

  if (!resendApiKey || !resendFrom) {
    console.warn(
      "[sendLeadConfirmationEmail] RESEND_API_KEY ou RESEND_FROM/EMAIL_FROM não configurados."
    );
    return { status: "not_configured", error: null };
  }

  const confirmUrl = `${appBaseUrl}/confirm?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(email)}`;

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: resendFrom,
      to: email,
      subject: "Confirme seu cadastro no Atomic CRM",
      html: `
        <p>Olá${name ? `, ${name}` : ""}!</p>
        <p>Recebemos seu cadastro no <strong>Atomic CRM</strong>.</p>
        <p>Para confirmar seu cadastro, clique no botão abaixo:</p>
        <p>
          <a href="${confirmUrl}" style="
            display:inline-block;
            padding:12px 20px;
            background:#111827;
            color:#ffffff;
            text-decoration:none;
            border-radius:6px;
            font-weight:600;
          ">
            Confirmar cadastro
          </a>
        </p>
        <p>Ou copie e cole este link no navegador:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      `,
    });

    return { status: "sent", error: null };
  } catch (err: any) {
    console.error("[sendLeadConfirmationEmail] Erro ao enviar e-mail:", err);
    return {
      status: "failed",
      error: {
        message: err?.message,
        name: err?.name ?? "Error",
      },
    };
  }
}
