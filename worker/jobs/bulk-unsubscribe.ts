import { Worker } from "bullmq";
import { connection } from "../../src/lib/queue";

new Worker("bulk-unsubscribe", async () => {}, { connection });
