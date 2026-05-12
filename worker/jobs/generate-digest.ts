import { Worker } from "bullmq";
import { prisma } from "../../src/lib/db";
import { getConnection, getSendDigestQueue } from "../../src/lib/queue";

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
        await getSendDigestQueue().add("send", { digestId: digest.id, userId: config.userId });
      }
    }
  },
  { connection: getConnection(), concurrency: 3 }
);
