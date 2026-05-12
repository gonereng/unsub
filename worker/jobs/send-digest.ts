import { Worker } from "bullmq";
import { connection } from "../../src/lib/queue";

new Worker("send-digest", async () => {}, { connection });
