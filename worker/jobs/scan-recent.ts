import { Worker } from "bullmq";
import { connection } from "../../src/lib/queue";

new Worker("scan-recent", async () => {}, { connection });
