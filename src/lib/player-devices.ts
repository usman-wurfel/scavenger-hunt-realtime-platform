import { parseFcmTokenInput } from "@/lib/fcm-token";
import { prisma } from "@/lib/prisma";

export function parseRequiredPlayerDeviceInput(
  input: unknown,
): { deviceId?: string; fcmToken?: string; error?: string } {
  if (!input || typeof input !== "object") {
    return { error: "Invalid request input" };
  }

  const record = input as Record<string, unknown>;
  const { deviceId } = record;

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    return { error: "deviceId is required" };
  }

  const trimmedDeviceId = deviceId.trim();
  if (trimmedDeviceId.length < 8 || trimmedDeviceId.length > 128) {
    return { error: "deviceId must be between 8 and 128 characters" };
  }

  const fcmParsed = parseFcmTokenInput(input);
  if (fcmParsed.error) {
    return { error: fcmParsed.error };
  }

  if (!fcmParsed.fcmToken) {
    return { error: "fcmToken is required" };
  }

  return {
    deviceId: trimmedDeviceId,
    fcmToken: fcmParsed.fcmToken,
  };
}

export async function savePlayerDeviceForHunt(
  deviceId: string,
  fcmToken: string,
): Promise<void> {
  await prisma.participantDevice.upsert({
    where: {
      deviceId_fcmToken: { deviceId, fcmToken },
    },
    update: {},
    create: {
      deviceId,
      fcmToken,
    },
  });
}

export async function linkPlayerDeviceParticipant(
  deviceId: string,
  fcmToken: string,
  participantId: string,
): Promise<void> {
  await prisma.participantDevice.updateMany({
    where: {
      deviceId,
      fcmToken,
    },
    data: {
      participantId,
    },
  });
}
