import { EventStatus } from "@prisma/client";
import type { BatchResponse, Messaging } from "firebase-admin/messaging";

import { getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/admin";
import { publishMqttMessage } from "@/lib/mqtt/client";
import {
  huntPlayerAdminMessageTopic,
  type HuntPlayerAdminMessagePayload,
} from "@/lib/mqtt/topics";
import { prisma } from "@/lib/prisma";

import { chunkFcmTokens, FCM_URGENT_CONCURRENCY } from "./messages";
import {
  getHuntJoinedTargetsPage,
  removeInvalidParticipantFcmTokens,
} from "./participant-tokens";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

const MQTT_PUBLISH_CONCURRENCY = 25;
const JOINED_TARGETS_PAGE_SIZE = 500;

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

async function sendAdminMessageFcmBatch(
  messaging: Messaging,
  batch: string[],
  input: { huntId: string; huntName: string; message: string },
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  const dataMessage =
    input.message.length > 800 ? `${input.message.slice(0, 797)}...` : input.message;

  const response = await messaging.sendEachForMulticast({
    tokens: batch,
    notification: {
      title: "Message from Admin",
      body: input.message,
    },
    data: {
      type: "admin_message",
      event: "admin_message",
      huntId: input.huntId,
      huntName: input.huntName,
      message: dataMessage,
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

async function publishAdminMessageMqtt(input: {
  huntId: string;
  huntName: string;
  deviceId: string;
  participantId: string;
  username: string;
  message: string;
}): Promise<void> {
  const payload: HuntPlayerAdminMessagePayload = {
    event: "admin_message",
    huntId: input.huntId,
    huntName: input.huntName,
    participantId: input.participantId,
    username: input.username,
    deviceId: input.deviceId,
    message: input.message,
    at: new Date().toISOString(),
  };

  await publishMqttMessage(
    huntPlayerAdminMessageTopic(input.huntId, input.deviceId),
    payload,
    { retain: false, qos: 1 },
  );
}

/** One-off admin message to all joined players in a started hunt (not saved). */
export async function sendHuntBroadcastMessage(input: {
  huntId: string;
  message: string;
}): Promise<
  | { sent: number; failed: number; tokens: number; mqtt: number; players: number }
  | { error: string }
> {
  const message = input.message.trim();
  if (!message) {
    return { error: "Message is required" };
  }
  if (message.length > 1000) {
    return { error: "Message must be at most 1000 characters" };
  }

  const hunt = await prisma.huntEvent.findUnique({
    where: { id: input.huntId },
    select: { id: true, eventName: true, status: true },
  });

  if (!hunt) {
    return { error: "Hunt not found" };
  }

  if (hunt.status !== EventStatus.STARTED) {
    return { error: "Only started hunts can broadcast messages to joined players" };
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
  let mqttSent = 0;
  let playersSeen = 0;
  let cursor: string | undefined;
  const invalidTokens = new Set<string>();

  for (;;) {
    const page = await getHuntJoinedTargetsPage({
      huntId: input.huntId,
      cursor,
      take: JOINED_TARGETS_PAGE_SIZE,
    });

    if (page.targets.length === 0) {
      if (!cursor) {
        return { error: "No joined players for this hunt" };
      }
      break;
    }

    playersSeen += page.targets.length;

    const pageTokens = [
      ...new Set(page.targets.flatMap((target) => target.fcmTokens)),
    ];
    tokensSeen += pageTokens.length;

    const tokenBatches = chunkFcmTokens(pageTokens);
    await mapPool(tokenBatches, FCM_URGENT_CONCURRENCY, async (batch) => {
      const result = await sendAdminMessageFcmBatch(messaging, batch, {
        huntId: hunt.id,
        huntName: hunt.eventName,
        message,
      });
      sent += result.sent;
      failed += result.failed;
      for (const token of result.invalidTokens) {
        invalidTokens.add(token);
      }
    });

    await mapPool(page.targets, MQTT_PUBLISH_CONCURRENCY, async (target) => {
      try {
        await publishAdminMessageMqtt({
          huntId: hunt.id,
          huntName: hunt.eventName,
          deviceId: target.deviceId,
          participantId: target.participantId,
          username: target.username,
          message,
        });
        mqttSent += 1;
      } catch (error) {
        console.error(
          `[mqtt-admin_message] failed hunt=${hunt.id} device=${target.deviceId}:`,
          error,
        );
      }
    });

    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  if (invalidTokens.size > 0) {
    await removeInvalidParticipantFcmTokens([...invalidTokens]);
  }

  if (playersSeen === 0) {
    return { error: "No joined players for this hunt" };
  }

  if (sent === 0 && mqttSent === 0) {
    return { error: "Failed to deliver message to joined players" };
  }

  console.log(
    `[push-broadcast] admin_message hunt=${hunt.id} players=${playersSeen} tokens=${tokensSeen} sent=${sent} failed=${failed} mqtt=${mqttSent}`,
  );

  return {
    sent,
    failed,
    tokens: tokensSeen,
    mqtt: mqttSent,
    players: playersSeen,
  };
}
