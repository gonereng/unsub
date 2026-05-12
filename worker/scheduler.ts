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
