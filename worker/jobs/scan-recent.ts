import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { getConnection } from "../../src/lib/queue";
import { createGmailClient, listMessages, getMessage, extractHeaders } from "../../src/lib/gmail";
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
  { connection: getConnection(), concurrency: 3 }
);
