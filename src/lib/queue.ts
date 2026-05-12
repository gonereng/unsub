import { Queue } from "bullmq";
import IORedis from "ioredis";

let _connection: IORedis | null = null;
let _scanInboxQueue: Queue | null = null;
let _scanRecentQueue: Queue | null = null;
let _bulkUnsubscribeQueue: Queue | null = null;
let _singleUnsubscribeQueue: Queue | null = null;
let _generateDigestQueue: Queue | null = null;
let _sendDigestQueue: Queue | null = null;

export function getScanInboxQueue() {
  if (!_scanInboxQueue) _scanInboxQueue = new Queue("scan-inbox", { connection: getConnection() });
  return _scanInboxQueue;
}

export function getScanRecentQueue() {
  if (!_scanRecentQueue) _scanRecentQueue = new Queue("scan-recent", { connection: getConnection() });
  return _scanRecentQueue;
}

export function getBulkUnsubscribeQueue() {
  if (!_bulkUnsubscribeQueue) _bulkUnsubscribeQueue = new Queue("bulk-unsubscribe", { connection: getConnection() });
  return _bulkUnsubscribeQueue;
}

export function getSingleUnsubscribeQueue() {
  if (!_singleUnsubscribeQueue) _singleUnsubscribeQueue = new Queue("single-unsubscribe", { connection: getConnection() });
  return _singleUnsubscribeQueue;
}

export function getGenerateDigestQueue() {
  if (!_generateDigestQueue) _generateDigestQueue = new Queue("generate-digest", { connection: getConnection() });
  return _generateDigestQueue;
}

export function getSendDigestQueue() {
  if (!_sendDigestQueue) _sendDigestQueue = new Queue("send-digest", { connection: getConnection() });
  return _sendDigestQueue;
}

export function getConnection() {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
}

export { IORedis };
export type { IORedis as Redis };
