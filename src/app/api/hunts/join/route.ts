export { dynamic } from "@/lib/api-route";

import { connection } from "next/server";
import { NextRequest } from "next/server";
import { EventStatus } from "@prisma/client";

import { apiFail, apiMessage, apiOk } from "@/lib/api-response";
import {
  NO_ACTIVE_HUNT_MESSAGE,
  serializeUserActiveHunt,
} from "@/lib/events";
import { findStartedHunt } from "@/lib/events-server";
import {
  deviceCanAccessHunt,
  getDeviceAreaIds,
  HUNT_NOT_AVAILABLE_IN_AREA_MESSAGE,
} from "@/lib/hunt-areas";
import { joinHuntParticipant, parseJoinHuntInput, serializeHuntParticipant } from "@/lib/hunt-participants";
import {
  buildHuntMqttConnectionInfo,
  notifyPlayerJoined,
} from "@/lib/mqtt/hunt-lifecycle";
import { linkPlayerDeviceParticipant } from "@/lib/player-devices";

export async function POST(request: NextRequest) {
  await connection();

  try {
    const body = await request.json();
    const parsed = parseJoinHuntInput(body);
    if (parsed.error || !parsed.deviceId || !parsed.fcmToken) {
      return apiFail(parsed.error || "deviceId and fcmToken are required", 400);
    }

    const hunt = await findStartedHunt();
    if (!hunt) {
      return apiMessage(NO_ACTIVE_HUNT_MESSAGE);
    }

    const areaIds = await getDeviceAreaIds(parsed.deviceId);
    if (
      areaIds.length > 0 &&
      !(await deviceCanAccessHunt(parsed.deviceId, hunt.areaId))
    ) {
      return apiFail(HUNT_NOT_AVAILABLE_IN_AREA_MESSAGE, 403);
    }

    const { participant, isNew } = await joinHuntParticipant(hunt.id, parsed.deviceId);

    await linkPlayerDeviceParticipant(
      parsed.deviceId,
      parsed.fcmToken,
      participant.id,
    );

    if (hunt.status === EventStatus.STARTED) {
      await notifyPlayerJoined(hunt.id, isNew);
    }

    const mqtt =
      hunt.status === EventStatus.STARTED
        ? await buildHuntMqttConnectionInfo({
            huntId: hunt.id,
            role: "player",
            deviceId: parsed.deviceId,
          })
        : null;

    return apiOk(
      {
        data: {
          participant: serializeHuntParticipant(participant),
          hunt: serializeUserActiveHunt(hunt),
          isNew,
          mqtt,
          areaIds,
          areaSelectionRequired: areaIds.length === 0,
        },
      },
      { status: isNew ? 201 : 200 },
    );
  } catch {
    return apiFail("Failed to join hunt", 500);
  }
}
