import { Worker } from "bullmq";
import { connection } from "../../src/lib/queue";

new Worker("single-unsubscribe", async () => {}, { connection });
