import { Worker } from "bullmq";
import { connection } from "../../src/lib/queue";

new Worker("generate-digest", async () => {}, { connection });
