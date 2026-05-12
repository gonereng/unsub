# Unsub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a commercial SaaS that lets users connect their Google/Microsoft inbox, detects email subscriptions, and provides one-click unsubscribe with bulk actions, block/whitelist, daily digest, and analytics.

**Architecture:** Monolithic Next.js app using App Router with a separate BullMQ worker process sharing Prisma client and Redis. PostgreSQL for persistence. Workers handle inbox scanning, unsubscribe execution, and digest generation asynchronously.

**Tech Stack:** Next.js 14+ (App Router, TypeScript), Prisma (PostgreSQL), NextAuth.js, BullMQ (Redis), Tailwind CSS, Docker Compose

---

## File Structure

```
unsub/
├── prisma/schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                             # Landing page
│   │   ├── globals.css
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                       # Dashboard shell + auth guard
│   │   │   ├── page.tsx                         # Subscription list
│   │   │   ├── stats/page.tsx                   # Analytics
│   │   │   └── undo/page.tsx                    # Action history
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── subscriptions/
│   │   │   │   ├── route.ts                     # GET (list)
│   │   │   │   ├── [id]/unsubscribe/route.ts
│   │   │   │   ├── [id]/block/route.ts
│   │   │   │   ├── [id]/whitelist/route.ts
│   │   │   │   ├── [id]/rollup/route.ts
│   │   │   │   └── bulk-unsubscribe/route.ts
│   │   │   ├── actions/
│   │   │   │   ├── route.ts                     # GET (history)
│   │   │   │   └── [id]/undo/route.ts
│   │   │   ├── stats/route.ts
│   │   │   ├── accounts/[id]/
│   │   │   │   ├── route.ts                     # DELETE (revoke)
│   │   │   │   └── scan/route.ts                # POST (trigger scan)
│   │   │   ├── digest-config/route.ts           # GET/PUT
│   │   │   └── webhook/
│   │   │       ├── gmail/route.ts
│   │   │       └── outlook/route.ts
│   ├── components/
│   │   ├── subscription-list.tsx
│   │   ├── subscription-row.tsx
│   │   ├── category-tabs.tsx
│   │   ├── preview-panel.tsx
│   │   ├── stats-cards.tsx
│   │   ├── action-history-list.tsx
│   │   ├── kill-switch-button.tsx
│   │   ├── bulk-action-bar.tsx
│   │   ├── financial-warning-modal.tsx
│   │   ├── digest-config-form.tsx
│   │   └── scan-progress.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── auth-providers.ts
│   │   ├── gmail.ts
│   │   ├── outlook.ts
│   │   ├── queue.ts
│   │   ├── unsubscribe.ts
│   │   ├── scan.ts
│   │   ├── categorize.ts
│   │   └── protect.ts
│   └── types/index.ts
├── worker/
│   ├── index.ts
│   ├── scheduler.ts
│   └── jobs/
│       ├── scan-inbox.ts
│       ├── scan-recent.ts
│       ├── bulk-unsubscribe.ts
│       ├── single-unsubscribe.ts
│       ├── generate-digest.ts
│       └── send-digest.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.example
└── postcss.config.js
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.example`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Initialize project and install dependencies**

Run: `npx create-next-app@latest unsub --typescript --tailwind --app --no-src-dir`

Then install additional deps:

```bash
cd C:\Workspace\unsub
npm install prisma @prisma/client next-auth @auth/prisma-adapter bullmq ioredis googleapis @microsoft/microsoft-graph-client openai
npm install -D @types/node tsx
```

- [ ] **Step 2: Write next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
};

export default nextConfig;
```

- [ ] **Step 3: Write .env.example**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/unsub"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
```

- [ ] **Step 4: Write src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Write src/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unsub",
  description: "Take control of your inbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Write landing page src/app/page.tsx**

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Unsub</h1>
      <p className="text-lg text-gray-600 mb-8">
        Find and unsubscribe from unwanted emails
      </p>
      <Link
        href="/api/auth/signin"
        className="rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        Get Started
      </Link>
    </main>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `npx next build 2>&1 | Select-String -NotMatch "⚠|○|λ|✓"` (expect success with minimal output)

---

### Task 2: Prisma Schema + DB Setup

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accounts      Account[]
  digestConfig  DigestConfig?
  digests       Digest[]
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  provider          String   @default("google")
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  expiresAt         Int?
  scope             String?
  tokenType         String?
  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  scanJobs      ScanJob[]

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Subscription {
  id                  String   @id @default(cuid())
  accountId           String
  senderName          String?
  senderEmail         String
  listUnsubscribe     String?
  listUnsubscribePost String?
  lastEmailAt         DateTime?
  frequency           String?
  category            String?
  isWhitelisted       Boolean  @default(false)
  isBlocked           Boolean  @default(false)
  isRolledUp          Boolean  @default(false)
  firstDetectedAt     DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  account   Account     @relation(fields: [accountId], references: [id], onDelete: Cascade)
  actions   ActionLog[]

  @@unique([accountId, senderEmail])
  @@index([accountId])
  @@index([category])
}

model ActionLog {
  id              String   @id @default(cuid())
  subscriptionId  String
  action          String
  metadata        Json?
  createdAt       DateTime @default(now())

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([createdAt])
}

model DigestConfig {
  id        String  @id @default(cuid())
  userId    String  @unique
  frequency String  @default("daily")
  time      String  @default("08:00")
  dayOfWeek Int?    @default(0)
  isEnabled Boolean @default(true)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Digest {
  id         String   @id @default(cuid())
  userId     String
  sentAt     DateTime @default(now())
  emailCount Int
  emails     Json?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, sentAt])
}

model ScanJob {
  id          String    @id @default(cuid())
  accountId   String
  status      String    @default("pending")
  startedAt   DateTime?
  completedAt DateTime?
  newCount    Int       @default(0)
  error       String?
  createdAt   DateTime  @default(now())

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, createdAt])
}
```

- [ ] **Step 2: Write src/lib/db.ts**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Run Prisma migration**

```bash
cd C:\Workspace\unsub
npx prisma generate
npx prisma db push
```

Expected: Schema created successfully.

---

### Task 3: NextAuth Setup + OAuth Providers

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-providers.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write src/lib/auth-providers.ts**

```ts
import type { OAuthConfig } from "next-auth/providers";

export const googleProvider: OAuthConfig<{
  email: string;
  name: string;
  picture: string;
}> = {
  id: "google",
  name: "Google",
  type: "oauth",
  authorization: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    params: {
      scope:
        "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/gmail.labels",
      access_type: "offline",
      prompt: "consent",
    },
  },
  token: "https://oauth2.googleapis.com/token",
  userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  profile(profile) {
    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      image: profile.picture,
    };
  },
};

export const microsoftProvider: OAuthConfig<{
  mail: string;
  displayName: string;
}> = {
  id: "microsoft",
  name: "Microsoft",
  type: "oauth",
  authorization: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    params: {
      scope: "openid email profile Mail.Read Mail.ReadWrite offline_access",
    },
  },
  token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userinfo: "https://graph.microsoft.com/v1.0/me",
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  profile(profile) {
    return {
      id: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      image: null,
    };
  },
};
```

- [ ] **Step 2: Write src/lib/auth.ts**

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { googleProvider, microsoftProvider } from "./auth-providers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [googleProvider, microsoftProvider],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session as any).accessToken = token.accessToken;
        (session as any).provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
```

- [ ] **Step 3: Write src/app/api/auth/[...nextauth]/route.ts**

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Add SessionProvider to layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unsub",
  description: "Take control of your inbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Write types**

Create `src/types/index.ts`:

```ts
import type { Session } from "next-auth";

export interface SessionWithToken extends Session {
  accessToken?: string;
  provider?: string;
}
```

---

### Task 4: Auth Callback — Account Creation + Initial Scan Trigger

**Files:**
- Modify: `src/lib/auth.ts` (add signIn callback)

- [ ] **Step 1: Add signIn callback to auth.ts**

Modify the NextAuth config in `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { googleProvider, microsoftProvider } from "./auth-providers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [googleProvider, microsoftProvider],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session as any).accessToken = token.accessToken;
        (session as any).provider = token.provider;
      }
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message.account && message.profile) {
        const existingAccount = await prisma.account.findFirst({
          where: {
            provider: message.account.provider,
            providerAccountId: message.account.providerAccountId,
          },
        });
        if (!existingAccount) {
          const user = await prisma.user.findUnique({
            where: { email: message.profile.email! },
          });
          if (user) {
            await prisma.account.create({
              data: {
                userId: user.id,
                provider: message.account.provider,
                providerAccountId: message.account.providerAccountId,
                accessToken: message.account.access_token as string,
                refreshToken: message.account.refresh_token as string,
                expiresAt: message.account.expires_at,
                scope: message.account.scope,
                tokenType: message.account.token_type,
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
});
```

- [ ] **Step 2: Verify sign-in flow compiles**

Run: `npx next build 2>&1 | Select-String -NotMatch "⚠|○|λ|✓"`

Expected: Build succeeds.

---

### Task 5: BullMQ Setup

**Files:**
- Create: `src/lib/queue.ts`
- Create: `worker/index.ts`
- Create: `worker/scheduler.ts`

- [ ] **Step 1: Write src/lib/queue.ts**

```ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const scanInboxQueue = new Queue("scan-inbox", { connection });
export const scanRecentQueue = new Queue("scan-recent", { connection });
export const bulkUnsubscribeQueue = new Queue("bulk-unsubscribe", { connection });
export const singleUnsubscribeQueue = new Queue("single-unsubscribe", { connection });
export const generateDigestQueue = new Queue("generate-digest", { connection });
export const sendDigestQueue = new Queue("send-digest", { connection });

export { connection };
```

- [ ] **Step 2: Write worker/scheduler.ts**

```ts
import { QueueScheduler } from "bullmq";
import { connection } from "../src/lib/queue";
import { scanRecentQueue, generateDigestQueue } from "../src/lib/queue";

export async function setupSchedulers() {
  await scanRecentQueue.upsertJobScheduler(
    "scan-recent-every-6h",
    { every: 6 * 60 * 60 * 1000 },
    { data: {} }
  );
  await generateDigestQueue.upsertJobScheduler(
    "digest-daily-8am",
    { pattern: "0 8 * * *" },
    { data: { frequency: "daily" } }
  );
  await generateDigestQueue.upsertJobScheduler(
    "digest-weekly-sun-9am",
    { pattern: "0 9 * * 0" },
    { data: { frequency: "weekly" } }
  );
}
```

- [ ] **Step 3: Write worker/index.ts**

```ts
import "./jobs/scan-inbox";
import "./jobs/scan-recent";
import "./jobs/bulk-unsubscribe";
import "./jobs/single-unsubscribe";
import "./jobs/generate-digest";
import "./jobs/send-digest";
import { setupSchedulers } from "./scheduler";

console.log("[Worker] Starting...");
setupSchedulers().then(() => {
  console.log("[Worker] Schedulers registered. Waiting for jobs...");
});
```

---

### Task 6: Gmail API Client

**Files:**
- Create: `src/lib/gmail.ts`

- [ ] **Step 1: Write src/lib/gmail.ts**

```ts
import { google } from "googleapis";

export function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export async function listMessages(
  gmail: ReturnType<typeof createGmailClient>,
  query: string,
  pageToken?: string
) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    pageToken,
    maxResults: 100,
  });
  return {
    messages: res.data.messages || [],
    nextPageToken: res.data.nextPageToken || undefined,
  };
}

export async function getMessage(
  gmail: ReturnType<typeof createGmailClient>,
  messageId: string
) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  return res.data;
}

export function extractHeaders(payload: { headers?: { name: string; value: string }[] }) {
  const headers: Record<string, string> = {};
  for (const h of payload.headers || []) {
    headers[h.name.toLowerCase()] = h.value;
  }
  return headers;
}

export async function createFilter(
  gmail: ReturnType<typeof createGmailClient>,
  from: string
) {
  await gmail.users.settings.filters.create({
    userId: "me",
    requestBody: {
      criteria: { from },
      action: { addLabelIds: ["TRASH"] },
    },
  });
}

export async function createLabel(
  gmail: ReturnType<typeof createGmailClient>,
  name: string
) {
  const res = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    },
  });
  return res.data.id!;
}

export async function moveToLabel(
  gmail: ReturnType<typeof createGmailClient>,
  messageId: string,
  labelId: string
) {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
      removeLabelIds: ["INBOX"],
    },
  });
}
```

---

### Task 7: Outlook API Client

**Files:**
- Create: `src/lib/outlook.ts`

- [ ] **Step 1: Write src/lib/outlook.ts**

```ts
export async function graphRequest(
  accessToken: string,
  endpoint: string,
  options?: RequestInit
) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listMessages(
  accessToken: string,
  filter?: string,
  skip?: number
) {
  let endpoint = "/me/messages?$top=100&$select=id,subject,from,receivedDateTime,body";
  if (filter) endpoint += `&$filter=${encodeURIComponent(filter)}`;
  if (skip) endpoint += `&$skip=${skip}`;
  return graphRequest(accessToken, endpoint);
}

export async function getMessage(accessToken: string, messageId: string) {
  return graphRequest(accessToken, `/me/messages/${messageId}`);
}

export async function createRule(accessToken: string, from: string) {
  const rule = {
    displayName: `Unsub Block: ${from}`,
    order: 1,
    conditions: {
      from: {
        emailAddresses: [{ address: from }],
      },
    },
    actions: {
      moveToFolder: "deleteditems",
    },
  };
  return graphRequest(accessToken, "/me/mailFolders/inbox/messages", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}
```

---

### Task 8: Email Parsing / Subscription Detection

**Files:**
- Create: `src/lib/scan.ts`
- Create: `src/lib/categorize.ts`

- [ ] **Step 1: Write src/lib/scan.ts**

```ts
const UNSUBSCRIBE_REGEX = /unsubscribe|opt.?out|cancel.?subscription/i;
const NEWSLETTER_DOMAINS = ["mail.", "newsletter.", "e.", "info.", "marketing."];

export function hasListUnsubscribeHeader(headers: Record<string, string>): boolean {
  return !!headers["list-unsubscribe"];
}

export function parseListUnsubscribe(headers: Record<string, string>): {
  url?: string;
  mailto?: string;
  httpPost?: string;
} {
  const raw = headers["list-unsubscribe"] || "";
  const result: { url?: string; mailto?: string; httpPost?: string } = {};

  const links = raw.split(",").map((s) => s.trim());
  for (const link of links) {
    const clean = link.replace(/^<|>$/g, "");
    if (clean.startsWith("mailto:")) result.mailto = clean;
    else if (clean.startsWith("http")) result.url = clean;
  }

  const postRaw = headers["list-unsubscribe-post"];
  if (postRaw) result.httpPost = postRaw;

  return result;
}

export function findUnsubscribeLinkInBody(body: string): string | null {
  const lines = body.split("\n");
  for (const line of lines) {
    if (UNSUBSCRIBE_REGEX.test(line)) {
      const match = line.match(/href=["'](https?:\/\/[^"']+)["']/i);
      if (match) return match[1];
    }
  }
  return null;
}

export function isLikelyNewsletter(
  senderEmail: string,
  headers: Record<string, string>,
  emailCountInWeek: number
): boolean {
  if (hasListUnsubscribeHeader(headers)) return true;
  const domain = senderEmail.split("@")[1] || "";
  if (NEWSLETTER_DOMAINS.some((prefix) => domain.startsWith(prefix))) return true;
  if (emailCountInWeek >= 3) return true;
  return false;
}
```

- [ ] **Step 2: Write src/lib/categorize.ts**

```ts
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shopping: ["order", "purchase", "cart", "checkout", "delivery", "amazon", "shop", "store", "deal", "sale"],
  news: ["newsletter", "daily", "briefing", "weekly", "report", "alert", "update", "today", "headline"],
  finance: ["bank", "statement", "invoice", "receipt", "payment", "billing", "transaction", "subscription"],
  social: ["facebook", "twitter", "linkedin", "instagram", "notification", "follow", "connection", "invite"],
};

export function categorizeSender(senderName: string, senderEmail: string): string {
  const text = `${senderName} ${senderEmail}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "other";
}
```

---

### Task 9: Inbox Scan Worker Jobs

**Files:**
- Create: `worker/jobs/scan-inbox.ts`
- Create: `worker/jobs/scan-recent.ts`

- [ ] **Step 1: Write worker/jobs/scan-inbox.ts**

```ts
import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { connection } from "../../src/lib/queue";
import { createGmailClient, listMessages, getMessage, extractHeaders } from "../../src/lib/gmail";
import { listMessages as listOutlookMessages, getMessage as getOutlookMessage } from "../../src/lib/outlook";
import { parseListUnsubscribe, findUnsubscribeLinkInBody, isLikelyNewsletter } from "../../src/lib/scan";
import { categorizeSender } from "../../src/lib/categorize";

new Worker(
  "scan-inbox",
  async (job) => {
    const { accountId, fullScan } = job.data as { accountId: string; fullScan?: boolean };
    const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    if (!account.active) return;

    await prisma.scanJob.create({
      data: { accountId, status: "scanning", startedAt: new Date() },
    });

    let newCount = 0;

    if (account.provider === "google") {
      const gmail = createGmailClient(account.accessToken!);
      const query = fullScan ? "unsubscribe OR newsletter OR -announce" : "newer_than:6m AND (unsubscribe OR newsletter OR -announce)";
      let pageToken: string | undefined;
      do {
        const { messages, nextPageToken } = await listMessages(gmail, query, pageToken);
        for (const msg of messages) {
          const detail = await getMessage(gmail, msg.id!);
          const headers = extractHeaders(detail.payload!);
          const fromHeader = headers["from"] || "";
          const senderEmail = fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader;
          const senderName = fromHeader.replace(/<[^>]+>/, "").trim();
          const listInfo = parseListUnsubscribe(headers);
          const hasHeader = !!listInfo.url || !!listInfo.mailto;
          const body = detail.payload?.body?.data
            ? Buffer.from(detail.payload.body.data, "base64").toString()
            : "";
          const bodyLink = !hasHeader ? findUnsubscribeLinkInBody(body) : null;

          if (isLikelyNewsletter(senderEmail, headers, 1)) {
            const existing = await prisma.subscription.findUnique({
              where: { accountId_senderEmail: { accountId, senderEmail } },
            });
            if (!existing) {
              await prisma.subscription.create({
                data: {
                  accountId,
                  senderName: senderName || senderEmail,
                  senderEmail,
                  listUnsubscribe: listInfo.url || listInfo.mailto,
                  listUnsubscribePost: listInfo.httpPost,
                  category: categorizeSender(senderName, senderEmail),
                },
              });
              newCount++;
            }
          }
        }
        pageToken = nextPageToken;
      } while (pageToken && fullScan);
    }

    await prisma.scanJob.updateMany({
      where: { accountId, status: "scanning" },
      data: { status: "completed", completedAt: new Date(), newCount },
    });
  },
  { connection, concurrency: 5 }
);
```

- [ ] **Step 2: Write worker/jobs/scan-recent.ts**

```ts
import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { connection } from "../../src/lib/queue";
import { createGmailClient, listMessages, getMessage, extractHeaders } from "../../src/lib/gmail";
import { listMessages as listOutlookMessages, getMessage as getOutlookMessage } from "../../src/lib/outlook";
import { parseListUnsubscribe, isLikelyNewsletter } from "../../src/lib/scan";
import { categorizeSender } from "../../src/lib/categorize";

new Worker(
  "scan-recent",
  async () => {
    const accounts = await prisma.account.findMany({ where: { active: true } });
    for (const account of accounts) {
      if (account.provider === "google") {
        const gmail = createGmailClient(account.accessToken!);
        const { messages } = await listMessages(gmail, "newer_than:1d");
        for (const msg of messages) {
          const detail = await getMessage(gmail, msg.id!);
          const headers = extractHeaders(detail.payload!);
          const fromHeader = headers["from"] || "";
          const senderEmail = fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader;
          const senderName = fromHeader.replace(/<[^>]+>/, "").trim();

          if (isLikelyNewsletter(senderEmail, headers, 1)) {
            const existing = await prisma.subscription.findUnique({
              where: { accountId_senderEmail: { accountId: account.id, senderEmail } },
            });
            if (!existing) {
              const listInfo = parseListUnsubscribe(headers);
              await prisma.subscription.create({
                data: {
                  accountId: account.id,
                  senderName: senderName || senderEmail,
                  senderEmail,
                  listUnsubscribe: listInfo.url || listInfo.mailto,
                  listUnsubscribePost: listInfo.httpPost,
                  category: categorizeSender(senderName, senderEmail),
                },
              });
            } else {
              await prisma.subscription.update({
                where: { id: existing.id },
                data: { lastEmailAt: new Date() },
              });
            }
          }
        }
      }
    }
  },
  { connection, concurrency: 3 }
);
```

---

### Task 10: Unsubscribe Worker Jobs

**Files:**
- Create: `worker/jobs/single-unsubscribe.ts`
- Create: `worker/jobs/bulk-unsubscribe.ts`
- Create: `src/lib/unsubscribe.ts`

- [ ] **Step 1: Write src/lib/unsubscribe.ts**

```ts
export async function unsubscribeViaHttp(url: string, postData?: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: postData ? "POST" : "GET",
      headers: postData ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
      body: postData || undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeViaMailto(
  mailto: string,
  accessToken: string,
  provider: string
): Promise<boolean> {
  try {
    const emailAddr = mailto.replace("mailto:", "").split("?")[0];
    if (provider === "google") {
      const { google } = await import("googleapis");
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: "v1", auth });
      const raw = Buffer.from(
        `To: ${emailAddr}\r\nSubject: Unsubscribe\r\n\r\nUnsubscribe`
      ).toString("base64url");
      await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Write worker/jobs/single-unsubscribe.ts**

```ts
import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { connection } from "../../src/lib/queue";
import { unsubscribeViaHttp, unsubscribeViaMailto } from "../../src/lib/unsubscribe";

new Worker(
  "single-unsubscribe",
  async (job) => {
    const { subscriptionId } = job.data as { subscriptionId: string };
    const sub = await prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { account: true },
    });
    if (!sub.account.active) throw new Error("Account inactive");

    let success = false;
    if (sub.listUnsubscribePost) {
      success = await unsubscribeViaHttp(sub.listUnsubscribePost);
    }
    if (!success && sub.listUnsubscribe) {
      if (sub.listUnsubscribe.startsWith("http")) {
        success = await unsubscribeViaHttp(sub.listUnsubscribe);
      } else if (sub.listUnsubscribe.startsWith("mailto:")) {
        success = await unsubscribeViaMailto(
          sub.listUnsubscribe,
          sub.account.accessToken!,
          sub.account.provider
        );
      }
    }

    await prisma.actionLog.create({
      data: {
        subscriptionId,
        action: success ? "unsubscribed" : "unsubscribed",
        metadata: { success, method: sub.listUnsubscribe ? "header" : "fallback" },
      },
    });

    return { success };
  },
  { connection, concurrency: 10 }
);
```

- [ ] **Step 3: Write worker/jobs/bulk-unsubscribe.ts**

```ts
import { Worker } from "bullmq";
import { connection, singleUnsubscribeQueue } from "../../src/lib/queue";

new Worker(
  "bulk-unsubscribe",
  async (job) => {
    const { subscriptionIds } = job.data as { subscriptionIds: string[] };
    const batchSize = 10;
    for (let i = 0; i < subscriptionIds.length; i += batchSize) {
      const batch = subscriptionIds.slice(i, i + batchSize);
      await singleUnsubscribeQueue.addBulk(
        batch.map((id) => ({ name: "unsubscribe", data: { subscriptionId: id } }))
      );
    }
    return { total: subscriptionIds.length };
  },
  { connection, concurrency: 3 }
);
```

---

### Task 11: API Routes — Subscriptions CRUD

**Files:**
- Create: `src/app/api/subscriptions/route.ts`
- Create: `src/app/api/subscriptions/[id]/unsubscribe/route.ts`
- Create: `src/app/api/subscriptions/[id]/block/route.ts`
- Create: `src/app/api/subscriptions/[id]/whitelist/route.ts`
- Create: `src/app/api/subscriptions/[id]/rollup/route.ts`
- Create: `src/app/api/subscriptions/bulk-unsubscribe/route.ts`

- [ ] **Step 1: Write subscription list route**

`src/app/api/subscriptions/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "lastEmailAt";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, active: true },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  const where: any = { accountId: { in: accountIds } };
  if (category && category !== "all") where.category = category;
  if (search) where.senderEmail = { contains: search, mode: "insensitive" };

  const [total, subscriptions] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ subscriptions, total, page, totalPages: Math.ceil(total / limit) });
}
```

- [ ] **Step 2: Write unsubscribe route**

`src/app/api/subscriptions/[id]/unsubscribe/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { singleUnsubscribeQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: params.id },
    include: { account: true },
  });
  if (sub.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await singleUnsubscribeQueue.add("unsubscribe", { subscriptionId: params.id });
  return NextResponse.json({ queued: true });
}
```

- [ ] **Step 3: Write block route**

`src/app/api/subscriptions/[id]/block/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { createGmailClient, createFilter } from "@/lib/gmail";
import { createRule } from "@/lib/outlook";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: params.id },
    include: { account: true },
  });
  if (sub.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (sub.account.provider === "google") {
    const gmail = createGmailClient(sub.account.accessToken!);
    await createFilter(gmail, sub.senderEmail);
  } else if (sub.account.provider === "microsoft") {
    await createRule(sub.account.accessToken!, sub.senderEmail);
  }

  await prisma.subscription.update({
    where: { id: params.id },
    data: { isBlocked: true, isWhitelisted: false },
  });
  await prisma.actionLog.create({
    data: { subscriptionId: params.id, action: "blocked" },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Write whitelist route**

`src/app/api/subscriptions/[id]/whitelist/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: params.id },
    include: { account: true },
  });
  if (sub.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.subscription.update({
    where: { id: params.id },
    data: { isWhitelisted: true, isBlocked: false },
  });
  await prisma.actionLog.create({
    data: { subscriptionId: params.id, action: "whitelisted" },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Write rollup toggle route**

`src/app/api/subscriptions/[id]/rollup/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: params.id },
    include: { account: true },
  });
  if (sub.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.subscription.update({
    where: { id: params.id },
    data: { isRolledUp: !sub.isRolledUp },
  });
  await prisma.actionLog.create({
    data: { subscriptionId: params.id, action: "rolled_up", metadata: { enabled: updated.isRolledUp } },
  });

  return NextResponse.json({ isRolledUp: updated.isRolledUp });
}
```

- [ ] **Step 6: Write bulk unsubscribe route**

`src/app/api/subscriptions/bulk-unsubscribe/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { bulkUnsubscribeQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscriptionIds } = await req.json();
  await bulkUnsubscribeQueue.add("bulk", { subscriptionIds });
  return NextResponse.json({ queued: true, count: subscriptionIds.length });
}
```

---

### Task 12: API Routes — Actions, Stats, Accounts, Digest, Webhooks

**Files:**
- Create: `src/app/api/actions/route.ts`
- Create: `src/app/api/actions/[id]/undo/route.ts`
- Create: `src/app/api/stats/route.ts`
- Create: `src/app/api/accounts/[id]/route.ts`
- Create: `src/app/api/accounts/[id]/scan/route.ts`
- Create: `src/app/api/digest-config/route.ts`
- Create: `src/app/api/webhook/gmail/route.ts`
- Create: `src/app/api/webhook/outlook/route.ts`
- Create: `src/lib/protect.ts`

- [ ] **Step 1: Write actions list route**

`src/app/api/actions/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const subscriptionIds = (
    await prisma.subscription.findMany({
      where: { accountId: { in: accounts.map((a) => a.id) } },
      select: { id: true },
    })
  ).map((s) => s.id);

  const [total, actions] = await Promise.all([
    prisma.actionLog.count({ where: { subscriptionId: { in: subscriptionIds } } }),
    prisma.actionLog.findMany({
      where: { subscriptionId: { in: subscriptionIds } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { subscription: { select: { senderName: true, senderEmail: true } } },
    }),
  ]);

  return NextResponse.json({ actions, total, page, totalPages: Math.ceil(total / limit) });
}
```

- [ ] **Step 2: Write undo route**

`src/app/api/actions/[id]/undo/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = await prisma.actionLog.findUniqueOrThrow({
    where: { id: params.id },
    include: { subscription: { include: { account: true } } },
  });
  if (action.subscription.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  switch (action.action) {
    case "blocked":
      await prisma.subscription.update({
        where: { id: action.subscriptionId },
        data: { isBlocked: false },
      });
      break;
    case "whitelisted":
      await prisma.subscription.update({
        where: { id: action.subscriptionId },
        data: { isWhitelisted: false },
      });
      break;
    case "rolled_up":
      await prisma.subscription.update({
        where: { id: action.subscriptionId },
        data: { isRolledUp: false },
      });
      break;
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Write stats route**

`src/app/api/stats/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountIds = (
    await prisma.account.findMany({ where: { userId: session.user.id }, select: { id: true } })
  ).map((a) => a.id);

  const [totalSubs, blockedCount, actionCount, digestCount] = await Promise.all([
    prisma.subscription.count({ where: { accountId: { in: accountIds } } }),
    prisma.subscription.count({ where: { accountId: { in: accountIds }, isBlocked: true } }),
    prisma.actionLog.count({
      where: { subscription: { accountId: { in: accountIds } } },
    }),
    prisma.digest.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    totalSubscriptions: totalSubs,
    blocked: blockedCount,
    actionsTaken: actionCount,
    digestsSent: digestCount,
  });
}
```

- [ ] **Step 4: Write account revoke route**

`src/app/api/accounts/[id]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findUniqueOrThrow({ where: { id: params.id } });
  if (account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.account.update({
    where: { id: params.id },
    data: { active: false, accessToken: null, refreshToken: null },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Write trigger scan route**

`src/app/api/accounts/[id]/scan/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scanInboxQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findUniqueOrThrow({ where: { id: params.id } });
  if (account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await scanInboxQueue.add("scan", { accountId: params.id, fullScan: true });
  return NextResponse.json({ queued: true });
}
```

- [ ] **Step 6: Write digest config route**

`src/app/api/digest-config/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.digestConfig.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json(config || { frequency: "daily", time: "08:00", isEnabled: false });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const config = await prisma.digestConfig.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });
  return NextResponse.json(config);
}
```

- [ ] **Step 7: Write webhook routes**

`src/app/api/webhook/gmail/route.ts`:

```ts
import { NextResponse } from "next/server";
import { scanInboxQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const emailAddress = body.emailAddress;
  if (!emailAddress) return NextResponse.json({ error: "missing emailAddress" }, { status: 400 });

  const account = await prisma.account.findFirst({
    where: { providerAccountId: emailAddress, active: true },
  });
  if (account) {
    await scanInboxQueue.add("scan", { accountId: account.id, fullScan: false });
  }

  return NextResponse.json({ received: true });
}
```

`src/app/api/webhook/outlook/route.ts`:

```ts
import { NextResponse } from "next/server";
import { scanInboxQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const emailAddress = body.emailAddress;
  if (!emailAddress) return NextResponse.json({ error: "missing emailAddress" }, { status: 400 });

  const account = await prisma.account.findFirst({
    where: { providerAccountId: emailAddress, active: true },
  });
  if (account) {
    await scanInboxQueue.add("scan", { accountId: account.id, fullScan: false });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 8: Write protect.ts**

`src/lib/protect.ts`:

```ts
const PROTECTED_KEYWORDS = [
  "receipt", "invoice", "payment", "bank", "flight",
  "booking", "confirmation", "statement", "billing", "ticket", "order",
];

export function isProtectedEmail(senderName: string, senderEmail: string): boolean {
  const text = `${senderName} ${senderEmail}`.toLowerCase();
  return PROTECTED_KEYWORDS.some((kw) => text.includes(kw));
}
```

---

### Task 13: Dashboard Layout + Auth Guard

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Write dashboard layout**

`src/app/(dashboard)/layout.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">Unsub</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">{session.user.email}</span>
          <Link href="/dashboard/stats" className="hover:underline">Stats</Link>
          <Link href="/dashboard/undo" className="hover:underline">Undo</Link>
          <a href="/api/auth/signout" className="text-red-600 hover:underline">Sign out</a>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4">{children}</main>
    </div>
  );
}
```

(Note: If not using `src/`, use `(dashboard)` as a route group in `app/`.)

- [ ] **Step 2: Write dashboard main page**

`src/app/(dashboard)/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SubscriptionList from "@/components/subscription-list";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, active: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Subscriptions</h1>
        {accounts.length === 0 && (
          <a
            href="/api/auth/signin"
            className="rounded-lg bg-black px-4 py-2 text-white text-sm hover:bg-gray-800"
          >
            Connect Email
          </a>
        )}
      </div>
      <SubscriptionList />
    </div>
  );
}
```

---

### Task 14: Subscription List UI Components

> **Note:** Depends on FinancialWarningModal from Task 15. Create a stub first (empty export) or implement Task 15 first.

**Files:**
- Create: `src/components/subscription-list.tsx`
- Create: `src/components/subscription-row.tsx`
- Create: `src/components/category-tabs.tsx`
- Create: `src/components/bulk-action-bar.tsx`
- Create: `src/components/preview-panel.tsx`
- Create: `src/components/scan-progress.tsx`

- [ ] **Step 1: Write category-tabs.tsx**

```tsx
"use client";

const CATEGORIES = ["all", "news", "shopping", "finance", "social", "other"];

export default function CategoryTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-3 py-1.5 rounded-full text-sm capitalize whitespace-nowrap ${
            active === cat
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write subscription-row.tsx**

```tsx
"use client";

interface SubscriptionRowProps {
  id: string;
  senderName: string;
  senderEmail: string;
  frequency: string | null;
  lastEmailAt: string | null;
  category: string | null;
  isBlocked: boolean;
  isWhitelisted: boolean;
  isRolledUp: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

export default function SubscriptionRow({
  id, senderName, senderEmail, frequency, lastEmailAt,
  category, isBlocked, isWhitelisted, isRolledUp,
  selected, onToggle, onAction,
}: SubscriptionRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 border-b hover:bg-gray-50">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(id)}
        className="rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{senderName}</span>
          {isBlocked && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Blocked</span>}
          {isWhitelisted && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Safe</span>}
          {isRolledUp && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Digest</span>}
          {category && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{category}</span>}
        </div>
        <div className="text-sm text-gray-500 truncate">{senderEmail}</div>
      </div>
      <div className="text-xs text-gray-400 hidden sm:block">
        {frequency || "—"} | {lastEmailAt ? new Date(lastEmailAt).toLocaleDateString() : "—"}
      </div>
      <div className="flex gap-1">
        {!isBlocked && (
          <button onClick={() => onAction(id, "block")} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Block</button>
        )}
        {!isWhitelisted && (
          <button onClick={() => onAction(id, "whitelist")} className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100">Keep</button>
        )}
        <button onClick={() => onAction(id, "unsubscribe")} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Unsub</button>
        <button onClick={() => onAction(id, "rollup")} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100">
          {isRolledUp ? "Unroll" : "Digest"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write subscription-list.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import CategoryTabs from "./category-tabs";
import SubscriptionRow from "./subscription-row";
import BulkActionBar from "./bulk-action-bar";
import PreviewPanel from "./preview-panel";
import FinancialWarningModal from "./financial-warning-modal";

interface Subscription {
  id: string;
  senderName: string;
  senderEmail: string;
  frequency: string | null;
  lastEmailAt: string | null;
  category: string | null;
  isBlocked: boolean;
  isWhitelisted: boolean;
  isRolledUp: boolean;
}

export default function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Subscription | null>(null);
  const [showWarning, setShowWarning] = useState<{ id: string; action: string } | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    const params = new URLSearchParams({ category, sort: "lastEmailAt", order: "desc" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/subscriptions?${params}`);
    const data = await res.json();
    setSubscriptions(data.subscriptions || []);
  }, [category, search]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = async (id: string, action: string) => {
    if (action === "block" || action === "unsubscribe") {
      const sub = subscriptions.find((s) => s.id === id);
      if (sub) {
        const res = await fetch(`/api/protect?name=${encodeURIComponent(sub.senderName)}&email=${encodeURIComponent(sub.senderEmail)}`);
        const { protected: isProtected } = await res.json();
        if (isProtected) {
          setShowWarning({ id, action });
          return;
        }
      }
    }
    await performAction(id, action);
  };

  const performAction = async (id: string, action: string) => {
    await fetch(`/api/subscriptions/${id}/${action}`, { method: "POST" });
    fetchSubscriptions();
  };

  const handleBulk = async (action: string) => {
    if (action === "unsubscribe") {
      await fetch("/api/subscriptions/bulk-unsubscribe", {
        method: "POST",
        body: JSON.stringify({ subscriptionIds: Array.from(selected) }),
      });
    } else {
      for (const id of selected) {
        await performAction(id, action);
      }
    }
    setSelected(new Set());
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search subscriptions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 border rounded-lg mb-4"
      />
      <CategoryTabs active={category} onSelect={setCategory} />
      <div className="border rounded-lg bg-white">
        {subscriptions.map((sub) => (
          <div key={sub.id} onClick={() => setPreview(sub)} className="cursor-pointer">
            <SubscriptionRow
              {...sub}
              selected={selected.has(sub.id)}
              onToggle={toggleSelect}
              onAction={handleAction}
            />
          </div>
        ))}
        {subscriptions.length === 0 && (
          <p className="p-8 text-center text-gray-400">No subscriptions found. Connect an email account to get started.</p>
        )}
      </div>
      {selected.size > 0 && (
        <BulkActionBar count={selected.size} onAction={handleBulk} onCancel={() => setSelected(new Set())} />
      )}
      {preview && <PreviewPanel sub={preview} onClose={() => setPreview(null)} />}
      {showWarning && (
        <FinancialWarningModal
          onConfirm={() => { performAction(showWarning.id, showWarning.action); setShowWarning(null); }}
          onCancel={() => setShowWarning(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write bulk-action-bar.tsx**

```tsx
"use client";

export default function BulkActionBar({
  count,
  onAction,
}: {
  count: number;
  onAction: (action: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-center gap-4 shadow-lg">
      <span className="text-sm text-gray-600">{count} selected</span>
      <button onClick={() => onAction("unsubscribe")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
        Unsubscribe All
      </button>
      <button onClick={() => onAction("block")} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
        Block All
      </button>
      <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
        Cancel
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Write preview-panel.tsx**

```tsx
"use client";

interface PreviewPanelProps {
  sub: { senderName: string; senderEmail: string; lastEmailAt: string | null };
  onClose: () => void;
}

export default function PreviewPanel({ sub, onClose }: PreviewPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l shadow-xl p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">{sub.senderName}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <p className="text-sm text-gray-500 mb-2">{sub.senderEmail}</p>
      {sub.lastEmailAt && (
        <p className="text-sm text-gray-400">Last email: {new Date(sub.lastEmailAt).toLocaleDateString()}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write scan-progress.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";

export default function ScanProgress({ accountId }: { accountId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/accounts/${accountId}/scan`);
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "completed" || data.status === "failed") clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [accountId]);

  return status ? (
    <div className="text-sm text-gray-500">
      {status === "scanning" ? "Scanning inbox..." : status === "completed" ? "Scan complete" : `Scan ${status}`}
    </div>
  ) : null;
}
```

---

### Task 15: Financial Warning + Stats + Action History UI

> **Note:** Implement this BEFORE or alongside Task 14 — Task 14 imports FinancialWarningModal from this task.

**Files:**
- Create: `src/components/financial-warning-modal.tsx`
- Create: `src/components/stats-cards.tsx`
- Create: `src/components/action-history-list.tsx`
- Create: `src/components/kill-switch-button.tsx`
- Create: `src/components/digest-config-form.tsx`
- Create: `src/app/(dashboard)/stats/page.tsx`
- Create: `src/app/(dashboard)/undo/page.tsx`
- Create: `src/app/api/protect/route.ts`

- [ ] **Step 1: Write financial warning modal**

`src/components/financial-warning-modal.tsx`:

```tsx
"use client";

export default function FinancialWarningModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-bold mb-2">Heads up!</h3>
        <p className="text-sm text-gray-600 mb-4">
          This looks like a transactional email (receipt, flight, banking, etc.).
          Unsubscribing may cause you to miss important updates.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write protect API route**

`src/app/api/protect/route.ts`:

```ts
import { NextResponse } from "next/server";

const PROTECTED_KEYWORDS = [
  "receipt", "invoice", "payment", "bank", "flight",
  "booking", "confirmation", "statement", "billing", "ticket", "order",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const email = searchParams.get("email") || "";
  const text = `${name} ${email}`.toLowerCase();
  const isProtected = PROTECTED_KEYWORDS.some((kw) => text.includes(kw));
  return NextResponse.json({ protected: isProtected });
}
```

- [ ] **Step 3: Write stats-cards.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalSubscriptions: number;
  blocked: number;
  actionsTaken: number;
  digestsSent: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard label="Subscriptions" value={stats.totalSubscriptions} />
      <StatCard label="Blocked" value={stats.blocked} />
      <StatCard label="Actions" value={stats.actionsTaken} />
      <StatCard label="Digests" value={stats.digestsSent} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Write stats page**

`src/app/(dashboard)/stats/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StatsCards from "@/components/stats-cards";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <StatsCards />
    </div>
  );
}
```

- [ ] **Step 5: Write action-history-list.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";

interface Action {
  id: string;
  action: string;
  createdAt: string;
  subscription: { senderName: string; senderEmail: string };
}

export default function ActionHistoryList() {
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    fetch("/api/actions").then((r) => r.json()).then((d) => setActions(d.actions || []));
  }, []);

  const undo = async (id: string) => {
    await fetch(`/api/actions/${id}/undo`, { method: "POST" });
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="border rounded-lg bg-white">
      {actions.length === 0 && <p className="p-8 text-center text-gray-400">No actions yet.</p>}
      {actions.map((action) => (
        <div key={action.id} className="flex items-center justify-between p-3 border-b">
          <div>
            <span className="font-medium capitalize">{action.action}</span>
            <span className="text-gray-500 mx-1">—</span>
            <span>{action.subscription.senderName}</span>
            <span className="text-xs text-gray-400 ml-2">{new Date(action.createdAt).toLocaleDateString()}</span>
          </div>
          <button onClick={() => undo(action.id)} className="text-xs text-blue-600 hover:underline">
            Undo
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write undo page**

`src/app/(dashboard)/undo/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ActionHistoryList from "@/components/action-history-list";

export default async function UndoPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Action History</h1>
      <ActionHistoryList />
    </div>
  );
}
```

- [ ] **Step 7: Write kill-switch-button.tsx**

```tsx
"use client";

import { useState } from "react";

export default function KillSwitchButton({ accountId }: { accountId: string }) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    if (!confirm("Revoke access? This will delete all data for this account.")) return;
    setRevoking(true);
    await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
    window.location.reload();
  };

  return (
    <button
      onClick={handleRevoke}
      disabled={revoking}
      className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {revoking ? "Revoking..." : "Revoke Access"}
    </button>
  );
}
```

- [ ] **Step 8: Write digest-config-form.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";

interface Config {
  frequency: string;
  time: string;
  isEnabled: boolean;
}

export default function DigestConfigForm() {
  const [config, setConfig] = useState<Config>({ frequency: "daily", time: "08:00", isEnabled: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/digest-config").then((r) => r.json()).then(setConfig);
  }, []);

  const save = async () => {
    await fetch("/api/digest-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <h3 className="font-bold">Digest Settings</h3>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={config.isEnabled} onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })} />
        <span className="text-sm">Enable daily/weekly digest</span>
      </label>
      {config.isEnabled && (
        <>
          <select
            value={config.frequency}
            onChange={(e) => setConfig({ ...config, frequency: e.target.value })}
            className="border rounded p-1 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="time"
            value={config.time}
            onChange={(e) => setConfig({ ...config, time: e.target.value })}
            className="border rounded p-1 text-sm"
          />
        </>
      )}
      <button onClick={save} className="block text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800">
        {saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}
```

---

### Task 16: Digest Worker Jobs

**Files:**
- Create: `worker/jobs/generate-digest.ts`
- Create: `worker/jobs/send-digest.ts`

- [ ] **Step 1: Write generate-digest.ts**

```ts
import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { connection } from "../../src/lib/queue";
import { sendDigestQueue } from "../../src/lib/queue";

new Worker(
  "generate-digest",
  async (job) => {
    const { frequency } = job.data as { frequency: string };
    const configs = await prisma.digestConfig.findMany({
      where: { isEnabled: true, frequency },
      include: { user: true },
    });

    for (const config of configs) {
      const accounts = await prisma.account.findMany({
        where: { userId: config.userId, active: true },
        select: { id: true },
      });
      const subscriptions = await prisma.subscription.findMany({
        where: { accountId: { in: accounts.map((a) => a.id) }, isRolledUp: true },
      });

      if (subscriptions.length > 0) {
        const digest = await prisma.digest.create({
          data: {
            userId: config.userId,
            emailCount: subscriptions.length,
            emails: subscriptions.map((s) => ({
              sender: s.senderName || s.senderEmail,
              email: s.senderEmail,
            })),
          },
        });
        await sendDigestQueue.add("send", { digestId: digest.id, userId: config.userId });
      }
    }
  },
  { connection, concurrency: 3 }
);
```

- [ ] **Step 2: Write send-digest.ts**

```ts
import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { connection } from "../../src/lib/queue";

new Worker(
  "send-digest",
  async (job) => {
    const { digestId, userId } = job.data as { digestId: string; userId: string };
    const digest = await prisma.digest.findUniqueOrThrow({ where: { id: digestId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const emails = (digest.emails as { sender: string; email: string }[]) || [];
    const html = `
      <h2>Your Unsub Digest</h2>
      <p>${emails.length} emails rolled up:</p>
      <ul>${emails.map((e) => `<li><strong>${e.sender}</strong> (${e.email})</li>`).join("")}</ul>
    `;

    const accounts = await prisma.account.findMany({
      where: { userId, active: true },
    });

    for (const account of accounts) {
      if (account.provider === "google") {
        const { google } = await import("googleapis");
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: account.accessToken! });
        const gmail = google.gmail({ version: "v1", auth });
        const raw = Buffer.from(
          `To: ${user.email}\r\nSubject: Unsub Digest\r\nMIME-Version: 1.0\r\nContent-Type: text/html\r\n\r\n${html}`
        ).toString("base64url");
        await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      }
    }
  },
  { connection, concurrency: 3 }
);
```

---

### Task 17: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/worker ./worker
COPY --from=base /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: unsub
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/unsub
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: change-me-in-production
      NEXTAUTH_URL: http://localhost:3000
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID}
      MICROSOFT_CLIENT_SECRET: ${MICROSOFT_CLIENT_SECRET}
    depends_on:
      - db
      - redis

  worker:
    build: .
    command: node worker/index.js
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/unsub
      REDIS_URL: redis://redis:6379
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID}
      MICROSOFT_CLIENT_SECRET: ${MICROSOFT_CLIENT_SECRET}
    depends_on:
      - db
      - redis

volumes:
  pgdata:
```

- [ ] **Step 3: Add start script to package.json**

Ensure `package.json` has scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "worker": "node worker/index.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  }
}
```

---

### Task 18: PWA Setup + Final Polish

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update next.config.ts for PWA**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

(Note: For a simpler approach without extra deps, PWA headers can be added manually.)

- [ ] **Step 2: Write manifest.json**

```json
{
  "name": "Unsub",
  "short_name": "Unsub",
  "description": "Take control of your inbox",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": []
}
```

- [ ] **Step 3: Add manifest link to layout**

Modify `src/app/layout.tsx` to include:

```tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unsub",
  description: "Take control of your inbox",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

---

## Spec Coverage Check

| Spec Feature | Task(s) |
|---|---|
| OAuth Integration (Google + Microsoft) | Task 3, Task 4, Task 6, Task 7 |
| Multi-Account Support | Task 4 (Account model), Task 11 (user filtering by accounts) |
| Privacy Controls / Kill Switch | Task 12 (DELETE /api/accounts/[id]) |
| Subscription Detection | Task 8, Task 9 |
| Historical Scanning (6-month lookback) | Task 9 (scan-inbox query) |
| Real-time Updates (push webhooks) | Task 12 (webhook routes) |
| One-Click Unsubscribe | Task 10 (single-unsubscribe worker) |
| Bulk Actions | Task 10 (bulk-unsubscribe worker), Task 11 (API) |
| Daily Digest (Rollup) | Task 16 (digest workers) |
| Block Senders | Task 11 (block route), Task 6 (Gmail filter), Task 7 (Outlook rule) |
| Keep/Whitelist | Task 11 (whitelist route) |
| Unified List View | Task 14 (subscription-list component) |
| Subscription Categorization | Task 8 (categorize.ts) |
| Rich Text Previews | Task 14 (preview-panel component) |
| Action History | Task 12 (actions API), Task 15 (action-history-list) |
| Unsubscribe Fallback | Task 8 (findUnsubscribeLinkInBody) |
| Financial Protection | Task 15 (protect route + warning modal) |
| Analytics and Stats | Task 12 (stats API), Task 15 (stats-cards) |
| Custom Digest Scheduling | Task 15 (digest-config-form), Task 5 (scheduler) |
| Mobile-First Design / PWA | Task 18 (manifest + layout) |
| Self-hosted Docker deployment | Task 17 (Dockerfile + docker-compose) |
