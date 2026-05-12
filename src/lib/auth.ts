import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, type Session } from "next-auth";
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
  events: {
    async signIn({ account, profile }: { account: any; profile?: any }) {
      if (account && profile) {
        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        });
        if (!existingAccount) {
          const user = await prisma.user.findUnique({
            where: { email: profile.email! },
          });
          if (user) {
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                accessToken: account.access_token as string,
                refreshToken: account.refresh_token as string,
                expiresAt: account.expires_at,
                scope: account.scope,
                tokenType: account.token_type,
              },
            });
          }
        }
      }
    },
  },
  pages: {
    signIn: "/",
  },
};

const handler = NextAuth(authOptions);

export const handlers = { GET: handler, POST: handler };
export const auth = (): Promise<Session | null> => getServerSession(authOptions as any);
