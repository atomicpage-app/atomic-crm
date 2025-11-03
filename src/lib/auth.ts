import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const whitelist = new Set(["jairo@atomicpage.com.br"]);

// Mantemos a lista curta e explícita para evitar leituras de configuração externas.

export function isAllowedEmail(email?: string | null) {
  if (!email) return false;
  return whitelist.has(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async signIn({ user }) {
      return isAllowedEmail(user.email);
    }
  }
};
