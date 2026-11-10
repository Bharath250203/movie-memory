import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async signIn({ account, profile }) {
      return (
        account?.provider === "google" &&
        profile?.email_verified === true &&
        !!profile.email
      );
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  logger: {
    // Do not log OAuth tokens, database URLs, or provider error payloads.
    error(error) {
      console.error("Authentication failed:", error.name);
    },
  },
});
