import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user?.email || "").toLowerCase();
      return allowed.length === 0 ? false : allowed.includes(email);
    },
    async session({ session }) {
      const email = (session?.user?.email || "").toLowerCase();
      if (allowed.includes(email)) (session as any).role = "admin";
      return session;
    }
  }
};
