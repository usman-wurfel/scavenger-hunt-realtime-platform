import { PrizeClaimStatus } from "@prisma/client";

import { getFirebaseMessaging, isFirebaseConfigured } from "@/lib/firebase/admin";
import { publishMqttMessage } from "@/lib/mqtt/client";
import {
  huntPlayerPrizeTopic,
  type HuntPlayerPrizePayload,
  type WinnerPrizeMqttEvent,
} from "@/lib/mqtt/topics";
import { prisma } from "@/lib/prisma";
import { chunkFcmTokens } from "@/lib/push-notifications/messages";

export type PrizeClaimStatusValue = "none" | "waiting" | "claimed";

export function serializePrizeClaimStatus(status: PrizeClaimStatus): PrizeClaimStatusValue {
  if (status === PrizeClaimStatus.WAITING) return "waiting";
  if (status === PrizeClaimStatus.CLAIMED) return "claimed";
  return "none";
}

/** Always returns a user-facing message string based on prize status. */
export function prizeMessageForStatus(
  status: PrizeClaimStatusValue,
  winnerMessage?: string | null,
  options?: { isFirstPlace?: boolean },
): string {
  if (options?.isFirstPlace === false) {
    return "No prize message available.";
  }

  if (status === "none") {
    return "Please wait for admin response for prize collection destination.";
  }

  if (status === "waiting") {
    const stored = winnerMessage?.trim();
    return stored || "A prize message is waiting for you.";
  }

  // claimed — always status-based, not the old admin body
  return "Prize has been claimed.";
}

export async function getParticipantFcmTokensByDevice(
  deviceId: string,
  participantId?: string,
): Promise<string[]> {
  const trimmedDeviceId = deviceId.trim();
  const devices = await prisma.participantDevice.findMany({
    where: {
      fcmToken: { not: null },
      OR: [
        { deviceId: trimmedDeviceId },
        ...(participantId ? [{ participantId }] : []),
      ],
    },
    select: { fcmToken: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return [
    ...new Set(
      devices
        .map((device) => device.fcmToken?.trim())
        .filter((token): token is string => !!token),
    ),
  ];
}

async function publishWinnerPrizeMqtt(input: {
  event: WinnerPrizeMqttEvent;
  huntId: string;
  huntName: string;
  participantId: string;
  username: string;
  deviceId: string;
  message?: string | null;
  status: "waiting" | "claimed";
}): Promise<void> {
  const payload: HuntPlayerPrizePayload = {
    event: input.event,
    huntId: input.huntId,
    huntName: input.huntName,
    participantId: input.participantId,
    username: input.username,
    deviceId: input.deviceId,
    message: input.message ?? null,
    status: input.status,
    at: new Date().toISOString(),
  };

  try {
    await publishMqttMessage(huntPlayerPrizeTopic(input.huntId, input.deviceId), payload, {
      retain: false,
      qos: 1,
    });
    console.log(
      `[mqtt-prize] ${input.event} hunt=${input.huntId} device=${input.deviceId} user=${input.username}`,
    );
  } catch (error) {
    console.error(`[mqtt-prize] Failed to publish ${input.event}:`, error);
  }
}

async function sendWinnerFcmEvent(input: {
  tokens: string[];
  type: WinnerPrizeMqttEvent;
  title: string;
  body: string;
  huntId: string;
  huntName: string;
  participantId: string;
  username: string;
  message?: string;
}): Promise<{ sent: number; failed: number; skipped: boolean; error?: string }> {
  if (input.tokens.length === 0) {
    console.warn(
      `[push-winner] No FCM tokens for participant=${input.participantId} type=${input.type}`,
    );
    return { sent: 0, failed: 0, skipped: false, error: "No FCM token for winner device" };
  }

  if (!isFirebaseConfigured()) {
    console.warn(`[push-winner] Firebase not configured — ${input.type} skipped`);
    return { sent: 0, failed: 0, skipped: true, error: "Firebase is not configured" };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    console.warn(`[push-winner] Firebase messaging unavailable — ${input.type} skipped`);
    return { sent: 0, failed: 0, skipped: true, error: "Firebase messaging unavailable" };
  }

  const dataMessage = input.message
    ? input.message.length > 800
      ? `${input.message.slice(0, 797)}...`
      : input.message
    : "";

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (const batch of chunkFcmTokens(input.tokens)) {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: input.title, body: input.body },
        data: {
          type: input.type,
          event: input.type,
          huntId: input.huntId,
          huntName: input.huntName,
          participantId: input.participantId,
          username: input.username,
          ...(dataMessage ? { message: dataMessage } : {}),
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

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((item, index) => {
        if (!item.success) {
          const preview = batch[index]?.slice(0, 16) ?? "?";
          const code = item.error?.code ?? "unknown";
          const msg = item.error?.message ?? "send failed";
          console.error(`[push-winner] ${input.type} token ${preview}… failed:`, code, msg);
          errors.push(`${code}: ${msg}`);
        }
      });
    }
  } catch (error) {
    console.error(`[push-winner] ${input.type} send threw:`, error);
    const message = error instanceof Error ? error.message : "Push send failed";
    return { sent, failed: failed + input.tokens.length, skipped: false, error: message };
  }

  console.log(
    `[push-winner] ${input.type} hunt=${input.huntId} user=${input.username} tokens=${input.tokens.length} sent=${sent} failed=${failed}`,
  );

  return {
    sent,
    failed,
    skipped: false,
    error: sent === 0 ? errors[0] ?? "Push failed for all tokens" : undefined,
  };
}

export async function sendWinnerMessagePush(input: {
  tokens: string[];
  huntId: string;
  huntName: string;
  participantId: string;
  username: string;
  message: string;
}): Promise<{ sent: number; failed: number; skipped: boolean; error?: string }> {
  return sendWinnerFcmEvent({
    tokens: input.tokens,
    type: "claim_now",
    title: "Message from Admin",
    body: input.message,
    huntId: input.huntId,
    huntName: input.huntName,
    participantId: input.participantId,
    username: input.username,
    message: input.message,
  });
}

export async function sendFirstPlaceWinnerMessage(input: {
  huntId: string;
  participantId: string;
  message: string;
}) {
  const message = input.message.trim();
  if (!message) {
    return { error: "Message is required" as const };
  }
  if (message.length > 1000) {
    return { error: "Message must be at most 1000 characters" as const };
  }

  const participant = await prisma.huntParticipant.findFirst({
    where: {
      id: input.participantId,
      eventId: input.huntId,
    },
    include: {
      event: {
        select: { id: true, eventName: true },
      },
    },
  });

  if (!participant) {
    return { error: "Participant not found" as const };
  }

  if (participant.scanRank !== 1) {
    return { error: "Only the first-place winner can receive this message" as const };
  }

  if (participant.prizeClaimStatus === PrizeClaimStatus.CLAIMED) {
    return { error: "Prize already claimed — messaging is locked" as const };
  }

  const tokens = await getParticipantFcmTokensByDevice(
    participant.deviceId,
    participant.id,
  );

  if (tokens.length === 0) {
    return {
      error:
        "Winner has no FCM token. Open the player app so device/FCM can register, then try again." as const,
    };
  }

  const push = await sendWinnerMessagePush({
    tokens,
    huntId: participant.event.id,
    huntName: participant.event.eventName,
    participantId: participant.id,
    username: participant.username,
    message,
  });

  if (push.skipped || push.sent === 0) {
    return {
      error: (push.error ??
        "Failed to send push notification to winner") as string,
    };
  }

  const updated = await prisma.huntParticipant.update({
    where: { id: participant.id },
    data: {
      winnerMessage: message,
      winnerMessageSentAt: new Date(),
      prizeClaimStatus: PrizeClaimStatus.WAITING,
    },
  });

  await publishWinnerPrizeMqtt({
    event: "claim_now",
    huntId: participant.event.id,
    huntName: participant.event.eventName,
    participantId: participant.id,
    username: participant.username,
    deviceId: participant.deviceId,
    message,
    status: "waiting",
  });

  return {
    participant: updated,
    huntName: participant.event.eventName,
  };
}

export async function markFirstPlaceClaimed(input: {
  huntId: string;
  participantId: string;
}) {
  const participant = await prisma.huntParticipant.findFirst({
    where: {
      id: input.participantId,
      eventId: input.huntId,
    },
    include: {
      event: {
        select: { id: true, eventName: true },
      },
    },
  });

  if (!participant) {
    return { error: "Participant not found" as const };
  }

  if (participant.scanRank !== 1) {
    return { error: "Only the first-place winner can be marked as claimed" as const };
  }

  if (participant.prizeClaimStatus === PrizeClaimStatus.CLAIMED) {
    return { participant, alreadyClaimed: true as const };
  }

  const updated = await prisma.huntParticipant.update({
    where: { id: participant.id },
    data: {
      prizeClaimStatus: PrizeClaimStatus.CLAIMED,
      prizeClaimedAt: new Date(),
    },
  });

  const huntName = participant.event.eventName;
  const tokens = await getParticipantFcmTokensByDevice(
    participant.deviceId,
    participant.id,
  );

  // Claim is saved even if push fails — still notify winner-only
  if (tokens.length > 0) {
    await sendWinnerFcmEvent({
      tokens,
      type: "claimed",
      title: "Prize Claimed",
      body: `Your prize for ${huntName} has been marked as claimed.`,
      huntId: participant.event.id,
      huntName,
      participantId: participant.id,
      username: participant.username,
    });
  } else {
    console.warn(
      `[push-winner] claimed: no FCM token for winner ${participant.username} hunt=${participant.event.id}`,
    );
  }

  await publishWinnerPrizeMqtt({
    event: "claimed",
    huntId: participant.event.id,
    huntName,
    participantId: participant.id,
    username: participant.username,
    deviceId: participant.deviceId,
    message: participant.winnerMessage,
    status: "claimed",
  });

  return { participant: updated, alreadyClaimed: false as const };
}

/** Admin: resolve rank-1 participant for a hunt (mobile-friendly, no participantId). */
export async function findFirstPlaceParticipant(huntId: string) {
  const hunt = await prisma.huntEvent.findUnique({
    where: { id: huntId },
    select: { id: true, eventName: true },
  });

  if (!hunt) {
    return { ok: false as const, error: "Hunt not found" as const };
  }

  const participant = await prisma.huntParticipant.findFirst({
    where: { eventId: huntId, scanRank: 1 },
  });

  if (!participant) {
    return { ok: false as const, error: "No first-place winner yet" as const };
  }

  return { ok: true as const, hunt, participant };
}

export async function getAdminFirstPlaceForHunt(huntId: string) {
  const found = await findFirstPlaceParticipant(huntId);
  if (!found.ok) {
    return { error: found.error };
  }

  const { hunt, participant } = found;
  const status = serializePrizeClaimStatus(participant.prizeClaimStatus);

  return {
    huntId: hunt.id,
    huntName: hunt.eventName,
    participant,
    status,
    winnerMessage: participant.winnerMessage,
    winnerMessageSentAt: participant.winnerMessageSentAt,
    prizeClaimedAt: participant.prizeClaimedAt,
  };
}

export async function sendFirstPlaceWinnerMessageByHunt(input: {
  huntId: string;
  message: string;
}) {
  const found = await findFirstPlaceParticipant(input.huntId);
  if (!found.ok) {
    return { error: found.error };
  }

  return sendFirstPlaceWinnerMessage({
    huntId: input.huntId,
    participantId: found.participant.id,
    message: input.message,
  });
}

export async function markFirstPlaceClaimedByHunt(huntId: string) {
  const found = await findFirstPlaceParticipant(huntId);
  if (!found.ok) {
    return { error: found.error };
  }

  return markFirstPlaceClaimed({
    huntId,
    participantId: found.participant.id,
  });
}

export async function getFirstPlacePrizeForDevice(input: {
  deviceId: string;
  huntId: string;
}) {
  const hunt = await prisma.huntEvent.findUnique({ where: { id: input.huntId } });

  if (!hunt) {
    return { error: "Hunt not found" as const };
  }

  const participant = await prisma.huntParticipant.findUnique({
    where: {
      eventId_deviceId: {
        eventId: hunt.id,
        deviceId: input.deviceId,
      },
    },
  });

  if (!participant || participant.scanRank !== 1) {
    return {
      huntId: hunt.id,
      huntName: hunt.eventName,
      isFirstPlace: false as const,
      status: "none" as const,
      message: prizeMessageForStatus("none", null, { isFirstPlace: false }),
      messageSentAt: null,
      claimedAt: null,
    };
  }

  const status = serializePrizeClaimStatus(participant.prizeClaimStatus);

  return {
    huntId: hunt.id,
    huntName: hunt.eventName,
    isFirstPlace: true as const,
    participantId: participant.id,
    username: participant.username,
    status,
    message: prizeMessageForStatus(status, participant.winnerMessage, { isFirstPlace: true }),
    messageSentAt: participant.winnerMessageSentAt?.toISOString() ?? null,
    claimedAt: participant.prizeClaimedAt?.toISOString() ?? null,
  };
}
