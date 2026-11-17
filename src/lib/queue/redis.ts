import type { ConnectionOptions } from "bullmq";

export function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() || "";
}

export function isRedisConfigured(): boolean {
  return getRedisUrl() !== "";
}

export function getRedisConnectionOptions(): ConnectionOptions {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  return {
    url,
    maxRetriesPerRequest: null,
  };
}
