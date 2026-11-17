export { dynamic } from "@/lib/api-route";

import { connection } from "next/server";
import { NextRequest } from "next/server";

import { apiFail, apiMessage, apiOk } from "@/lib/api-response";
import { isPlayerVisibleActiveHunt } from "@/lib/events";
import {
  parseQrScanInput,
  QR_SCAN_INVALID_CODE_MESSAGE,
  QR_SCAN_INVALID_HUNT_MESSAGE,
  recordHuntQrScan,
  serializeQrScan,
} from "@/lib/hunt-qr-scan";
import { notifyPlayerScanned } from "@/lib/mqtt/hunt-lifecycle";
import { prisma } from "@/lib/prisma";
import { notifyAdminQrScanPush } from "@/lib/push-notifications/notify";

export async function POST(request: NextRequest) {
  await connection();

  try {
    const body = await request.json();
    const parsed = parseQrScanInput(body);
    if (parsed.error || !parsed.deviceId || !parsed.huntCode) {
      return apiFail(parsed.error || "Invalid scan request", 400);
    }

    const hunt = await prisma.huntEvent.findUnique({
      where: { eventCode: parsed.huntCode },
    });

    if (!hunt) {
      return apiMessage(QR_SCAN_INVALID_CODE_MESSAGE);
    }

    if (!isPlayerVisibleActiveHunt(hunt)) {
      return apiMessage(QR_SCAN_INVALID_HUNT_MESSAGE);
    }

    const result = await recordHuntQrScan(hunt.id, parsed.deviceId);
    if ("error" in result) {
      return apiMessage(result.error);
    }

    if (result.participant.scanRank === null || result.participant.scannedAt === null) {
      return apiFail("Failed to record QR scan", 500);
    }

    await notifyPlayerScanned(hunt.id);

    if (result.isFirstScan) {
      await notifyAdminQrScanPush({
        huntId: hunt.id,
        username: result.participant.username,
        deviceId: result.participant.deviceId,
        scanRank: result.participant.scanRank,
      });
    }

    return apiOk({
      data: serializeQrScan(result.participant, result.isFirstScan),
    });
  } catch {
    return apiFail("Failed to record QR scan", 500);
  }
}
