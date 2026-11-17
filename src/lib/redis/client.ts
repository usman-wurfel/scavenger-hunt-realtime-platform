import Redis from "ioredis";

import { getRedisUrl, isRedisConfigured } from "@/lib/queue/redis";

let client: Redis | null = null;

export function isLiveRedisConfigured(): boolean {
  return isRedisConfigured();
}

export function getRedisClient(): Redis {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!client) {
    client = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null,
    });
  }

  return client;
}

export async function closeRedisClient(): Promise<void> {
  if (!client) return;
  const current = client;
  client = null;
  await current.quit();
}
