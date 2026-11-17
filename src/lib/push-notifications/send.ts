import type { BatchResponse, Messaging } from "firebase-admin/messaging";

import { getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

import {
  buildHuntPushContent,
  chunkFcmTokens,
  FCM_BATCH_PAUSE_MS,
  FCM_URGENT_CONCURRENCY,
  type HuntPushPayload,
} from "./messages";
import {
  getParticipantFcmTokenPage,
  removeInvalidParticipantFcmTokens,
} from "./participant-tokens";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

export type SendHuntPushOptions = {
  /**
   * urgent = parallel FCM batches (for T-5m window so ~5k devices finish quickly).
   * normal = sequential with short pauses (default).
   */
  mode?: "normal" | "urgent";
};

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
}

async function sendMulticastBatch(
  messaging: Messaging,
  batch: string[],
  content: ReturnType<typeof buildHuntPushContent>,
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  const response = await messaging.sendEachForMulticast({
    tokens: batch,
    notification: {
      title: content.title,
      body: content.body,
    },
    data: content.data,
    android: {
      priority: "high",
      notification: {
        channelId: "hunt_events",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
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

export async function sendHuntPushNotification(
  payload: HuntPushPayload,
  options?: SendHuntPushOptions,
): Promise<{
  sent: number;
  failed: number;
  skipped: boolean;
  tokens: number;
}> {
  if (!isFirebaseConfigured()) {
    console.warn("[push] Firebase not configured — notification skipped");
    return { sent: 0, failed: 0, skipped: true, tokens: 0 };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.warn("[push] Firebase messaging unavailable — notification skipped");
    return { sent: 0, failed: 0, skipped: true, tokens: 0 };
  }

  const mode = options?.mode ?? "normal";
  const content = buildHuntPushContent(payload);
  const hunt = await prisma.huntEvent.findUnique({
    where: { id: payload.huntId },
    select: { areaId: true },
  });
  const areaId = hunt?.areaId ?? null;
  let sent = 0;
  let failed = 0;
  let tokensSeen = 0;
  let cursor: string | undefined;
  let batchIndex = 0;

  // Stream tokens in pages so 5k+ devices don't allocate one giant array at once.
  for (;;) {
    const page = await getParticipantFcmTokenPage({ cursor, take: 1000, areaId });
    if (page.tokens.length === 0) {
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
      continue;
    }

    tokensSeen += page.tokens.length;
    const tokenBatches = chunkFcmTokens(page.tokens);

    if (mode === "urgent") {
      await mapPool(tokenBatches, FCM_URGENT_CONCURRENCY, async (batch) => {
        const result = await sendMulticastBatch(messaging, batch, content);
        sent += result.sent;
        failed += result.failed;
        if (result.invalidTokens.length > 0) {
          await removeInvalidParticipantFcmTokens([...new Set(result.invalidTokens)]);
        }
      });
    } else {
      for (const batch of tokenBatches) {
        if (batchIndex > 0) {
          await sleep(FCM_BATCH_PAUSE_MS);
        }
        batchIndex += 1;

        const result = await sendMulticastBatch(messaging, batch, content);
        sent += result.sent;
        failed += result.failed;
        if (result.invalidTokens.length > 0) {
          await removeInvalidParticipantFcmTokens([...new Set(result.invalidTokens)]);
        }
      }
    }

    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  if (tokensSeen === 0) {
    console.log(`[push] No participant FCM tokens found for ${payload.type}`);
    return { sent: 0, failed: 0, skipped: false, tokens: 0 };
  }

  console.log(
    `[push] ${payload.type} (${mode}) for "${payload.huntName}" — sent=${sent}, failed=${failed}, tokens=${tokensSeen}`,
  );

  return { sent, failed, skipped: false, tokens: tokensSeen };
}
