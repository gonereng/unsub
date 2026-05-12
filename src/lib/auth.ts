import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession } from "next-auth";
import { prisma } from "./db";
import { googleProvider, microsoftProvider } from "./auth-providers";

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [googleProvider, microsoftProvider],
  callbacks: {
    async jwt({ token, account }: { token: any; account: any }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.sub;
        session.accessToken = token.accessToken;
        session.provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

const handler = NextAuth(authOptions);

export const handlers = { GET: handler, POST: handler };
export const auth = () => getServerSession(authOptions as any);
