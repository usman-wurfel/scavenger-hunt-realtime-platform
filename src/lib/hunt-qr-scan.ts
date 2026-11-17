import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const QR_SCAN_SUCCESS_MESSAGE = "You found the QR code!";
export const QR_ALREADY_SCANNED_MESSAGE = "You already scanned this QR code.";
export const QR_SCAN_NOT_JOINED_MESSAGE = "You must join the hunt before scanning the QR code.";
export const QR_SCAN_INVALID_HUNT_MESSAGE = "This hunt is not available for scanning.";
export const QR_SCAN_INVALID_CODE_MESSAGE = "Invalid hunt QR code.";

export type QrScanRecord = {
  deviceId: string;
  username: string;
  scanRank: number;
  scannedAt: string;
  message: string;
  isFirstScan: boolean;
};

const MAX_SCAN_RANK_ATTEMPTS = 5;

export function parseQrScanInput(body: unknown): { deviceId?: string; huntCode?: string; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const record = body as Record<string, unknown>;
  const { deviceId } = record;
  const huntCode = record.huntCode ?? record.eventCode;

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    return { error: "deviceId is required" };
  }

  if (typeof huntCode !== "string" || !huntCode.trim()) {
    return { error: "huntCode is required" };
  }

  const trimmedDeviceId = deviceId.trim();
  if (trimmedDeviceId.length < 8 || trimmedDeviceId.length > 128) {
    return { error: "deviceId must be between 8 and 128 characters" };
  }

  const trimmedHuntCode = huntCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,15}$/.test(trimmedHuntCode)) {
    return { error: "huntCode is invalid" };
  }

  return { deviceId: trimmedDeviceId, huntCode: trimmedHuntCode };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function serializeQrScan(
  participant: {
    deviceId: string;
    username: string;
    scanRank: number | null;
    scannedAt: Date | null;
  },
  isFirstScan: boolean,
): QrScanRecord {
  return {
    deviceId: participant.deviceId,
    username: participant.username,
    scanRank: participant.scanRank!,
    scannedAt: participant.scannedAt!.toISOString(),
    message: isFirstScan ? QR_SCAN_SUCCESS_MESSAGE : QR_ALREADY_SCANNED_MESSAGE,
    isFirstScan,
  };
}

export type RecordHuntQrScanResult =
  | { error: string }
  | {
      participant: {
        deviceId: string;
        username: string;
        scanRank: number | null;
        scannedAt: Date | null;
      };
      isFirstScan: boolean;
    };

export async function recordHuntQrScan(
  eventId: string,
  deviceId: string,
): Promise<RecordHuntQrScanResult> {
  const participant = await prisma.huntParticipant.findUnique({
    where: { eventId_deviceId: { eventId, deviceId } },
  });

  if (!participant) {
    return { error: QR_SCAN_NOT_JOINED_MESSAGE };
  }

  if (participant.scanRank !== null && participant.scannedAt !== null) {
    return {
      participant,
      isFirstScan: false,
    };
  }

  for (let attempt = 0; attempt < MAX_SCAN_RANK_ATTEMPTS; attempt += 1) {
    const scannedCount = await prisma.huntParticipant.count({
      where: { eventId, scanRank: { not: null } },
    });
    const nextRank = scannedCount + 1;
    const scannedAt = new Date();

    try {
      const updated = await prisma.huntParticipant.update({
        where: { id: participant.id, scanRank: null },
        data: { scanRank: nextRank, scannedAt },
      });

      return { participant: updated, isFirstScan: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const current = await prisma.huntParticipant.findUnique({
          where: { id: participant.id },
        });
        if (current && current.scanRank !== null && current.scannedAt !== null) {
          return { participant: current, isFirstScan: false };
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to record QR scan rank");
}
