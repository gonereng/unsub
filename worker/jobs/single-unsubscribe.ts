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
        action: "unsubscribed",
        metadata: { success, method: sub.listUnsubscribe ? "header" : "fallback" },
      },
    });

    return { success };
  },
  { connection, concurrency: 10 }
);
