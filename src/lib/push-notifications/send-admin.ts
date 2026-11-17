import type { BatchResponse } from "firebase-admin/messaging";

import { getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/admin";

import { getAdminFcmTokens, removeInvalidAdminFcmTokens } from "./admin-tokens";
import { chunkFcmTokens } from "./messages";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function isInvalidFcmTokenError(code?: string, message?: string): boolean {
  if (!code) return false;
  if (INVALID_TOKEN_ERRORS.has(code)) return true;
  // Fake / malformed tokens often come back as invalid-argument.
  return (
    code === "messaging/invalid-argument" &&
    !!message &&
    /registration token/i.test(message)
  );
}

function collectInvalidTokens(tokens: string[], response: BatchResponse): string[] {
  const invalidTokens: string[] = [];

  response.responses.forEach((item, index) => {
    if (!item.success && isInvalidFcmTokenError(item.error?.code, item.error?.message)) {
      const token = tokens[index];
      if (token) invalidTokens.push(token);
    }
  });

  return invalidTokens;
}

export async function sendAdminScheduledHuntStartedPush(
  huntId: string,
  huntName: string,
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  return sendAdminPush({
    title: "Scheduled Hunt Started",
    body: `${huntName} has started as scheduled.`,
    data: {
      type: "admin_scheduled_hunt_started",
      huntId,
      huntName,
    },
    logLabel: `scheduled hunt started "${huntName}"`,
  });
}

export async function sendAdminQrScanPush(input: {
  huntId: string;
  huntName: string;
  username: string;
  deviceId: string;
  scanRank: number;
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const { huntId, huntName, username, deviceId, scanRank } = input;
  const isFirstPlace = scanRank === 1;

  return sendAdminPush({
    title: isFirstPlace ? "First Place!" : "QR Scan",
    body: isFirstPlace
      ? `${username} scanned first in ${huntName}.`
      : `${username} scanned QR in ${huntName} (rank #${scanRank}).`,
    data: {
      type: isFirstPlace ? "admin_first_place_scan" : "admin_qr_scan",
      huntId,
      huntName,
      username,
      deviceId,
      scanRank: String(scanRank),
    },
    logLabel: `QR scan rank ${scanRank} "${huntName}" by ${username}`,
  });
}

async function sendAdminPush(input: {
  title: string;
  body: string;
  data: Record<string, string>;
  logLabel: string;
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!isFirebaseConfigured()) {
    console.warn(`[push-admin] Firebase not configured — ${input.logLabel} skipped`);
    return { sent: 0, failed: 0, skipped: true };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.warn(`[push-admin] Firebase messaging unavailable — ${input.logLabel} skipped`);
    return { sent: 0, failed: 0, skipped: true };
  }

  const tokens = await getAdminFcmTokens();
  if (tokens.length === 0) {
    console.log(`[push-admin] No admin FCM tokens found for ${input.logLabel}`);
    return { sent: 0, failed: 0, skipped: false };
  }

  const tokenBatches = chunkFcmTokens(tokens);
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const batch of tokenBatches) {
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title: input.title, body: input.body },
      data: input.data,
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

    sent += response.successCount;
    failed += response.failureCount;
    invalidTokens.push(...collectInvalidTokens(batch, response));

    response.responses.forEach((item, index) => {
      if (!item.success) {
        console.error(
          `[push-admin] token failed (${batch[index]?.slice(0, 12)}…):`,
          item.error?.code,
          item.error?.message,
        );
      }
    });
  }

  if (invalidTokens.length > 0) {
    await removeInvalidAdminFcmTokens([...new Set(invalidTokens)]);
  }

  console.log(
    `[push-admin] ${input.logLabel} — sent=${sent}, failed=${failed}, tokens=${tokens.length}`,
  );

  return { sent, failed, skipped: false };
}
