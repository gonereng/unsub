import { Worker } from "bullmq";
import { getConnection, getSingleUnsubscribeQueue } from "../../src/lib/queue";

new Worker(
  "bulk-unsubscribe",
  async (job) => {
    const { subscriptionIds } = job.data as { subscriptionIds: string[] };
    const batchSize = 10;
    for (let i = 0; i < subscriptionIds.length; i += batchSize) {
      const batch = subscriptionIds.slice(i, i + batchSize);
      await getSingleUnsubscribeQueue().addBulk(
        batch.map((id) => ({ name: "unsubscribe", data: { subscriptionId: id } }))
      );
    }
    return { total: subscriptionIds.length };
  },
  { connection: getConnection(), concurrency: 3 }
);
