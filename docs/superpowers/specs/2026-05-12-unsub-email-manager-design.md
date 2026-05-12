# Unsub — Email Subscription Manager Design

## Overview

A commercial SaaS app that helps users unsubscribe from email newsletters. Users connect their Google/Microsoft inbox via OAuth, the app scans for subscriptions, and provides one-click unsubscribe, bulk actions, blocking, digest rollups, and analytics.

## Tech Stack

- **Frontend/Backend:** Next.js + TypeScript (App Router)
- **Database:** PostgreSQL via Prisma ORM
- **Queue:** BullMQ + Redis (background jobs)
- **Auth:** NextAuth.js with Google + Microsoft OAuth (same tokens used for inbox access)
- **Hosting:** Self-hosted via Docker Compose
- **Styling:** Tailwind CSS
- **PWA:** next-pwa for mobile install + swipe gestures

## Architecture

Monolithic Next.js app with a separate BullMQ worker process, sharing Prisma client and Redis connection.

```
unsub/
├── prisma/              # Schema + migrations
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (dashboard)/ # Protected dashboard routes
│   │   ├── api/         # API routes
│   │   └── auth/        # OAuth callback routes
│   ├── components/      # Shared React components
│   ├── lib/
│   │   ├── db.ts        # Prisma client singleton
│   │   ├── auth.ts      # NextAuth config
│   │   ├── email/       # Email parsing utilities
│   │   ├── gmail.ts     # Gmail API client
│   │   ├── outlook.ts   # Outlook API client
│   │   └── queue.ts     # BullMQ client
│   ├── jobs/            # Background job definitions
│   └── types/           # Shared TypeScript types
├── worker/              # BullMQ worker entrypoint
├── docker-compose.yml   # PostgreSQL + Redis + app
├── Dockerfile
└── package.json
```

### Services

```
Next.js App  ←→  PostgreSQL (Prisma)
     ↕              Redis (BullMQ)
  Worker Process
     ↕
Google APIs / Microsoft Graph
```

## Database Schema

7 core tables:

### User
- `id` String @id
- `email` String @unique
- `name` String?
- `image` String?
- `createdAt` DateTime
- `updatedAt` DateTime

### Account
- `id` String @id
- `userId` String (FK → User)
- `provider` String ("google" | "microsoft")
- `providerAccountId` String
- `accessToken` String (encrypted at rest)
- `refreshToken` String (encrypted at rest)
- `expiresAt` Int?
- `scope` String?
- `tokenType` String?
- `active` Boolean @default(true) — false = kill switch revoked
- Unique: [provider, providerAccountId]
- Index: [userId]

### Subscription
- `id` String @id
- `accountId` String (FK → Account)
- `senderName` String?
- `senderEmail` String
- `listUnsubscribe` String? (URL or mailto:)
- `listUnsubscribePost` String? (HTTP POST endpoint)
- `lastEmailAt` DateTime?
- `frequency` String? (daily, weekly, monthly)
- `category` String? (shopping, news, finance, social, other)
- `isWhitelisted` Boolean @default(false)
- `isBlocked` Boolean @default(false)
- `firstDetectedAt` DateTime @default(now())
- Unique: [accountId, senderEmail]
- Index: [accountId], [category]

### ActionLog
- `id` String @id
- `subscriptionId` String (FK → Subscription)
- `action` String (unsubscribed | blocked | whitelisted | rolled_up)
- `metadata` Json? (extra context, e.g., fallback used, warning shown)
- `createdAt` DateTime @default(now())
- Index: [subscriptionId], [createdAt]

### DigestConfig
- `id` String @id
- `userId` String @unique (FK → User)
- `frequency` String @default("daily") (daily | weekly)
- `time` String @default("08:00") (HH:mm)
- `dayOfWeek` Int? @default(0) (0=Sun...6=Sat, for weekly)
- `isEnabled` Boolean @default(true)

### Digest
- `id` String @id
- `userId` String (FK → User)
- `sentAt` DateTime @default(now())
- `emailCount` Int
- `emails` Json? — `[{ subject, sender, snippet, url }]`
- Index: [userId, sentAt]

### ScanJob
- `id` String @id
- `accountId` String (FK → Account)
- `status` String (pending | scanning | completed | failed)
- `startedAt` DateTime?
- `completedAt` DateTime?
- `newCount` Int @default(0)
- `error` String?
- Index: [accountId, startedAt]

## Auth Flow (NextAuth + Dual-Purpose OAuth)

The same OAuth token handles authentication AND inbox access.

### OAuth Scopes

**Google:**
- `openid email profile` (auth/user info)
- `https://www.googleapis.com/auth/gmail.readonly` (read inbox)
- `https://www.googleapis.com/auth/gmail.settings.basic` (create block filters)
- `https://www.googleapis.com/auth/gmail.labels` (move digest emails)

**Microsoft:**
- `offline_access openid profile` (auth + refresh token)
- `Mail.Read` (read inbox)
- `Mail.ReadWrite` (move/filter emails)

### Flow
1. User clicks "Sign in with Google/Microsoft"
2. OAuth consent screen requests auth + mail scopes
3. NextAuth receives callback, stores tokens in Account table
4. On callback: trigger initial inbox scan job (BullMQ)
5. Set up push notification webhook
6. User lands on dashboard — scan runs in background

### Kill Switch
1. User clicks "Revoke Access" in settings
2. POST to provider revoke endpoint
3. Delete Account + Subscription + ActionLog + Digest records
4. User stays logged in, can re-connect later

### Token Refresh
NextAuth's built-in JWT callback refreshes tokens automatically. If refresh fails, mark Account.active = false and show reconnect banner.

## Inbox Scanning Pipeline

### Initial Scan (on account connect)
Query inbox for subscription emails with date filter (6 months). For each match:
- Parse List-Unsubscribe header
- Extract sender info
- If no header: search HTML body for unsubscribe link
- Upsert into Subscription table

Full scan button available for emails older than 6 months — paginates through ALL messages without date filter, throttled at 10 req/s.

### Real-Time Push
- Google: Pub/Sub topic + `users.watch()`
- Microsoft: Graph subscription webhook
- On new email: check if sender matches subscription criteria, auto-add

### Scheduled Re-scan
BullMQ repeatable job every 6 hours per active account. Fetches recent messages, detects new subscriptions, updates lastEmailAt for existing ones.

### Detection Logic
An email is classified as a subscription if ANY of:
1. List-Unsubscribe header present
2. Unsubscribe link in HTML body (regex)
3. Sender domain matches newsletter pattern
4. Same sender sends 3+ emails in 7 days (frequency heuristic)

### Worker Flow
```
scan-inbox job → Create ScanJob → Fetch messages → Parse → Upsert → Categorize → Complete
```

## Email Management Actions

### One-Click Unsubscribe
- mailto: → send via provider API
- http/https → POST request
- No header → fallback: extract link from HTML body
- Log in ActionLog

### Bulk Unsubscribe
- Select 50+ → enqueue bulk-unsubscribe BullMQ job
- Process in parallel (batch of 10)
- Real-time progress via polling
- Summary: "45 succeeded, 5 failed — retry?"
- Rate limited: 5 req/s per provider

### Block Sender
- Gmail: `users.settings.filters.create` → Trash
- Outlook: create inbox rule
- Set Subscription.isBlocked = true
- Log in ActionLog

### Keep/Whitelist
- Set isWhitelisted = true, isBlocked = false
- Scanner skips this sender on future scans
- Subscription still visible with "whitelisted" badge

### Daily Digest / Rollup
- User marks subscription as "rollup"
- At scheduled time (DigestConfig): fetch new emails
- Generate HTML digest with subject, snippet, original link
- Move originals to hidden folder
- Send digest via provider API or transactional email service

## Dashboard UI

Mobile-first PWA with:
- Swipe left = block, swipe right = keep/whitelist, tap = preview
- Bottom nav: Home | Stats | Undo
- Category tabs: All | News | Shopping | Finance | Social
- Search + sort (by frequency, last email, sender)
- Bulk selection with action bar
- Rich preview panel (subject, sender, snippet)
- Action history with undo
- Analytics: subscriptions, blocked, time saved, digests sent
- Shareable stats graphic (html-to-image)

## Unsubscribe Fallback
For emails without List-Unsubscribe headers:
- Scan HTML body for unsubscribe link
- Extract URL, verify validity
- Open in iframe or redirect user
- No link found → offer Block Sender

## Financial Protection
Check sender against protected keywords (receipt, invoice, payment, bank, flight, etc.). If match → warning modal before unsubscribe/block. Phase 2: lightweight LLM.

## BullMQ Background Jobs

### Queues
- `scan-inbox` — initial + full inbox scan
- `scan-recent` — 6-hourly re-scan
- `bulk-unsubscribe` — batch unsubscribe (10 items/job)
- `single-unsubscribe` — one-click unsubscribe
- `generate-digest` — generate daily/weekly digest
- `send-digest` — send generated digest

### Repeatable Jobs
- Every 6h → scan-recent for all active accounts
- Daily at 08:00 → generate-digest (daily users)
- Sunday at 09:00 → generate-digest (weekly users)

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/subscriptions | List subscriptions (paginated, sorted, filtered) |
| POST | /api/subscriptions/:id/unsubscribe | Unsubscribe single |
| POST | /api/subscriptions/bulk-unsubscribe | Bulk unsubscribe |
| POST | /api/subscriptions/:id/block | Block sender |
| POST | /api/subscriptions/:id/whitelist | Whitelist sender |
| POST | /api/subscriptions/:id/rollup | Toggle digest rollup |
| GET | /api/actions | Action history |
| POST | /api/actions/:id/undo | Undo an action |
| GET | /api/stats | Dashboard analytics |
| POST | /api/accounts/:id/scan | Trigger full scan |
| DELETE | /api/accounts/:id | Revoke (kill switch) |
| GET | /api/digest-config | Get digest config |
| PUT | /api/digest-config | Update digest config |
| POST | /api/auth/webhook/gmail | Gmail push notification |
| POST | /api/auth/webhook/outlook | Outlook push notification |

## Deployment

Docker Compose with four services:
- `app` — Next.js (port 3000)
- `worker` — BullMQ worker (same Dockerfile, different command)
- `db` — PostgreSQL 16
- `redis` — Redis 7 Alpine

Optional nginx for TLS termination and domain routing. Environment variables for all secrets.
