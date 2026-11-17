import type { BatchResponse, Messaging } from "firebase-admin/messaging";

import { getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/admin";

import { chunkFcmTokens, FCM_URGENT_CONCURRENCY } from "./messages";
import {
  getParticipantFcmTokenPage,
  removeInvalidParticipantFcmTokens,
} from "./participant-tokens";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

/** Page size for streaming all installed-app FCM tokens (keeps memory bounded). */
const ALL_USERS_TOKEN_PAGE_SIZE = 1000;

/** Parallel FCM multicasts — tuned for 5k–50k devices without saturating Firebase. */
const ALL_USERS_FCM_CONCURRENCY = Math.max(FCM_URGENT_CONCURRENCY, 8);

function collectInvalidTokens(tokens: string[], response: BatchResponse): string[] {
  const invalidTokens: string[] = [];

  response.responses.forEach((item, index) => {
    if (!item.success && item.error?.code && INVALID_TOKEN_ERRORS.has(item.error.code)) {
      const token = tokens[index];
      if (token) invalidTokens.push(token);
    }
  });

  return invalidTokens;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;

  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      await worker(items[current]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
}

async function sendAppBroadcastFcmBatch(
  messaging: Messaging,
  batch: string[],
  message: string,
  areaId: string,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  const dataMessage = message.length > 800 ? `${message.slice(0, 797)}...` : message;

  const response = await messaging.sendEachForMulticast({
    tokens: batch,
    notification: {
      title: "Message from Admin",
      body: message,
    },
    data: {
      type: "app_broadcast",
      event: "app_broadcast",
      message: dataMessage,
      areaId,
    },
    android: {
      priority: "high",
      notification: {
        channelId: "hunt_events",
        sound: "default",
      },
    },
    apns: {
      headers: {
        "apns-priority": "10",
      },
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
    invalidTokens: collectInvalidTokens(batch, response),
  };
}

/**
 * One-off FCM to devices subscribed to the selected area. Message is not saved.
 *
 * Streams tokens in pages + parallel FCM batches so 5k–50k devices stay memory-safe.
 */
export async function sendAppBroadcastMessage(input: {
  message: string;
  areaId: string;
}): Promise<{ sent: number; failed: number; tokens: number } | { error: string }> {
  const message = input.message.trim();
  if (!message) {
    return { error: "Message is required" };
  }
  if (message.length > 1000) {
    return { error: "Message must be at most 1000 characters" };
  }

  if (!isFirebaseConfigured()) {
    return { error: "Firebase is not configured" };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return { error: "Firebase messaging is unavailable" };
  }

  let sent = 0;
  let failed = 0;
  let tokensSeen = 0;
  let cursor: string | undefined;
  const invalidTokens = new Set<string>();

  for (;;) {
    const page = await getParticipantFcmTokenPage({
      cursor,
      take: ALL_USERS_TOKEN_PAGE_SIZE,
      areaId: input.areaId,
    });

    if (page.tokens.length === 0) {
      if (page.nextCursor) {
        cursor = page.nextCursor;
        continue;
      }
      break;
    }

    tokensSeen += page.tokens.length;
    const tokenBatches = chunkFcmTokens(page.tokens);

    await mapPool(tokenBatches, ALL_USERS_FCM_CONCURRENCY, async (batch) => {
      const result = await sendAppBroadcastFcmBatch(messaging, batch, message, input.areaId);
      sent += result.sent;
      failed += result.failed;
      for (const token of result.invalidTokens) {
        invalidTokens.add(token);
      }
    });

    // Flush invalid tokens periodically so the set does not grow unbounded at 50k+.
    if (invalidTokens.size >= 500) {
      await removeInvalidParticipantFcmTokens([...invalidTokens]);
      invalidTokens.clear();
    }

    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  if (invalidTokens.size > 0) {
    await removeInvalidParticipantFcmTokens([...invalidTokens]);
  }

  if (tokensSeen === 0) {
    return { error: "No FCM tokens registered for the selected area" };
  }

  if (sent === 0) {
    return { error: "Failed to deliver message to app users" };
  }

  console.log(
    `[push-broadcast] app_broadcast area=${input.areaId} tokens=${tokensSeen} sent=${sent} failed=${failed}`,
  );

  return { sent, failed, tokens: tokensSeen };
}
