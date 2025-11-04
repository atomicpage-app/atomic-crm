import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Whitelist de e-mails via env:
 * - ADMIN_EMAILS: lista separada por vírgula
 * - ADMIN_EMAIL: fallback com um único e-mail
 */
const allowed: string[] = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  if (allowed.length === 0) return false; // sem whitelist definida, bloqueia por segurança
  return allowed.includes(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return isAllowedEmail(user?.email ?? null);
    },
    async session({ session }) {
      const email = session?.user?.email?.toLowerCase() || "";
      (session as any).role = allowed.includes(email) ? "admin" : "denied";
      return session;
    },
  },
  // Importante: não definir `pages` para rotas de API do NextAuth,
  // para evitar loops de redirecionamento.
};