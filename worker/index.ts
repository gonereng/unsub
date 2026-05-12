import "./jobs/scan-inbox";
import "./jobs/scan-recent";
import "./jobs/bulk-unsubscribe";
import "./jobs/single-unsubscribe";
import "./jobs/generate-digest";
import "./jobs/send-digest";
import { setupSchedulers } from "./scheduler";

console.log("[Worker] Starting...");
setupSchedulers().then(() => {
  console.log("[Worker] Schedulers registered. Waiting for jobs...");
});
