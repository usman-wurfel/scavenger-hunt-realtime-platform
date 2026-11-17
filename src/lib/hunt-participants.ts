import { Prisma } from "@prisma/client";

import { parseFcmTokenInput } from "@/lib/fcm-token";
import { prisma } from "@/lib/prisma";

const USERNAME_PREFIX = "Hunter-";
const USERNAME_PAD_LENGTH = 3;
const MAX_USERNAME_ATTEMPTS = 10;

export type HuntParticipantRecord = {
  id: string;
  username: string;
  deviceId: string;
  huntId: string;
  createdAt: string;
  updatedAt: string;
};

export function parseJoinHuntInput(
  body: unknown,
): { deviceId?: string; fcmToken?: string; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const record = body as Record<string, unknown>;
  const { deviceId } = record;

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    return { error: "deviceId is required" };
  }

  const trimmed = deviceId.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    return { error: "deviceId must be between 8 and 128 characters" };
  }

  const fcmParsed = parseFcmTokenInput(body);
  if (fcmParsed.error) {
    return { error: fcmParsed.error };
  }

  if (!fcmParsed.fcmToken) {
    return { error: "fcmToken is required" };
  }

  return {
    deviceId: trimmed,
    fcmToken: fcmParsed.fcmToken,
  };
}

function formatParticipantUsername(sequence: number): string {
  return `${USERNAME_PREFIX}${String(sequence).padStart(USERNAME_PAD_LENGTH, "0")}`;
}

async function getNextParticipantUsername(): Promise<string> {
  const participants = await prisma.huntParticipant.findMany({
    where: { username: { startsWith: USERNAME_PREFIX } },
    select: { username: true },
  });

  let maxSequence = 0;
  for (const participant of participants) {
    const suffix = participant.username.slice(USERNAME_PREFIX.length);
    const sequence = Number.parseInt(suffix, 10);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return formatParticipantUsername(maxSequence + 1);
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function serializeHuntParticipant(participant: {
  id: string;
  username: string;
  deviceId: string;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
}): HuntParticipantRecord {
  return {
    id: participant.id,
    username: participant.username,
    deviceId: participant.deviceId,
    huntId: participant.eventId,
    createdAt: participant.createdAt.toISOString(),
    updatedAt: participant.updatedAt.toISOString(),
  };
}

export async function findParticipantByDevice(eventId: string, deviceId: string) {
  return prisma.huntParticipant.findUnique({
    where: {
      eventId_deviceId: { eventId, deviceId },
    },
  });
}

export async function joinHuntParticipant(
  eventId: string,
  deviceId: string,
) {
  const existing = await findParticipantByDevice(eventId, deviceId);
  if (existing) {
    return { participant: existing, isNew: false as const };
  }

  for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt += 1) {
    const username = await getNextParticipantUsername();

    try {
      const participant = await prisma.huntParticipant.create({
        data: {
          eventId,
          deviceId,
          username,
        },
      });

      return { participant, isNew: true as const };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const raced = await findParticipantByDevice(eventId, deviceId);
        if (raced) {
          return { participant: raced, isNew: false as const };
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to assign a unique participant username");
}
