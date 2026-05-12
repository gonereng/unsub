import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const scanInboxQueue = new Queue("scan-inbox", { connection });
export const scanRecentQueue = new Queue("scan-recent", { connection });
export const bulkUnsubscribeQueue = new Queue("bulk-unsubscribe", { connection });
export const singleUnsubscribeQueue = new Queue("single-unsubscribe", { connection });
export const generateDigestQueue = new Queue("generate-digest", { connection });
export const sendDigestQueue = new Queue("send-digest", { connection });
