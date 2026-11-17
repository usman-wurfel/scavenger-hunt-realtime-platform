export { dynamic } from "@/lib/api-route";

import { connection, NextRequest } from "next/server";

import { apiFail, apiMessage, apiOk } from "@/lib/api-response";
import {
  NO_ACTIVE_HUNT_MESSAGE,
  serializeUserActiveHunt,
} from "@/lib/events";
import { findStartedHunt, findTodayScheduledHunts } from "@/lib/events-server";
import { getDeviceAreaIds } from "@/lib/hunt-areas";
import {
  attachPlayerMqttToHunts,
  resolveActiveApiMqtt,
} from "@/lib/mqtt/hunt-lifecycle";
import { parseRequiredPlayerDeviceInput, savePlayerDeviceForHunt } from "@/lib/player-devices";

export async function GET(request: NextRequest) {
  await connection();

  const parsed = parseRequiredPlayerDeviceInput({
    deviceId: request.nextUrl.searchParams.get("deviceId"),
    fcmToken: request.nextUrl.searchParams.get("fcmToken"),
  });
  if (parsed.error || !parsed.deviceId || !parsed.fcmToken) {
    return apiFail(parsed.error || "deviceId and fcmToken are required", 400);
  }

  await savePlayerDeviceForHunt(parsed.deviceId, parsed.fcmToken);

  const [startedHunt, allTodayScheduledHunts, areaIds] = await Promise.all([
    findStartedHunt(),
    findTodayScheduledHunts(),
    getDeviceAreaIds(parsed.deviceId),
  ]);
  const areaSelectionRequired = areaIds.length === 0;
  const canSee = (row: { areaId: string | null; area: { isActive: boolean } | null }) =>
    row.areaId === null ||
    (!!row.area?.isActive && (areaSelectionRequired || areaIds.includes(row.areaId)));
  const hunt = startedHunt && canSee(startedHunt) ? startedHunt : null;
  const todayScheduledHunts = allTodayScheduledHunts.filter(canSee);

  const todayScheduled = await attachPlayerMqttToHunts(
    todayScheduledHunts.map(serializeUserActiveHunt),
    parsed.deviceId,
  );

  const mqtt = await resolveActiveApiMqtt(hunt, todayScheduled, parsed.deviceId);

  if (!hunt) {
    return apiMessage(NO_ACTIVE_HUNT_MESSAGE, {
      mqtt,
      todayScheduled,
      areaIds,
      areaSelectionRequired,
    });
  }

  return apiOk({
    data: serializeUserActiveHunt(hunt),
    mqtt,
    todayScheduled,
    areaIds,
    areaSelectionRequired,
  });
}
