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

    const scanJob = await prisma.scanJob.create({
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

    await prisma.scanJob.update({
      where: { id: scanJob.id },
      data: { status: "completed", completedAt: new Date(), newCount },
    });
  },
  { connection, concurrency: 5 }
);
