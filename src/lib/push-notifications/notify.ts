import { prisma } from "@/lib/prisma";

import type { HuntPushEventType } from "./messages";
import {
  sendAdminQrScanPush,
  sendAdminScheduledHuntStartedPush,
} from "./send-admin";
import { sendHuntPushNotification } from "./send";

async function getHuntName(huntId: string): Promise<string | null> {
  const hunt = await prisma.huntEvent.findUnique({
    where: { id: huntId },
    select: { eventName: true },
  });

  return hunt?.eventName ?? null;
}

function dispatchHuntPush(
  type: HuntPushEventType,
  huntId: string,
  huntName: string,
): void {
  const payload = { type, huntId, huntName };

  void sendHuntPushNotification(payload).catch((error) => {
    console.error(`[push] Failed to send ${type} for hunt ${huntId}`, error);
  });
}

export async function notifyAdminScheduledHuntStartedPush(huntId: string): Promise<void> {
  const huntName = await getHuntName(huntId);
  if (!huntName) return;

  try {
    await sendAdminScheduledHuntStartedPush(huntId, huntName);
  } catch (error) {
    console.error(`[push-admin] Failed to send scheduled hunt started for ${huntId}`, error);
  }
}

export async function notifyAdminQrScanPush(input: {
  huntId: string;
  username: string;
  deviceId: string;
  scanRank: number;
}): Promise<void> {
  const huntName = await getHuntName(input.huntId);
  if (!huntName) return;

  try {
    await sendAdminQrScanPush({
      huntId: input.huntId,
      huntName,
      username: input.username,
      deviceId: input.deviceId,
      scanRank: input.scanRank,
    });
  } catch (error) {
    console.error(`[push-admin] Failed to send QR scan push for ${input.huntId}`, error);
  }
}

export async function notifyHuntStartedPush(huntId: string): Promise<void> {
  const huntName = await getHuntName(huntId);
  if (!huntName) return;

  dispatchHuntPush("hunt_started", huntId, huntName);
}

export async function notifyHuntEndedPush(huntId: string): Promise<void> {
  const huntName = await getHuntName(huntId);
  if (!huntName) return;

  dispatchHuntPush("hunt_ended", huntId, huntName);
}

export async function notifyHuntsEndedPush(huntIds: string[]): Promise<void> {
  if (huntIds.length === 0) return;

  const hunts = await prisma.huntEvent.findMany({
    where: { id: { in: huntIds } },
    select: { id: true, eventName: true },
  });

  for (const hunt of hunts) {
    dispatchHuntPush("hunt_ended", hunt.id, hunt.eventName);
  }
}
