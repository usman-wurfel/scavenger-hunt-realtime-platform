export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { apiFail, apiOk } from "@/lib/api-response";
import {
  getDeviceAreaIds,
  parseAreaIds,
  replaceDeviceAreas,
  serializeHuntArea,
} from "@/lib/hunt-areas";
import {
  parseRequiredPlayerDeviceInput,
  savePlayerDeviceForHunt,
} from "@/lib/player-devices";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
  if (!deviceId) return apiFail("deviceId is required", 400);

  const [areaIds, areas] = await Promise.all([
    getDeviceAreaIds(deviceId),
    prisma.huntArea.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return apiOk({
    areaIds,
    areas: areas.map(serializeHuntArea),
    areaSelectionRequired: areaIds.length === 0,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const device = parseRequiredPlayerDeviceInput(body);
  if (device.error || !device.deviceId || !device.fcmToken) {
    return apiFail(device.error || "deviceId and fcmToken are required", 400);
  }

  const parsedAreas = parseAreaIds((body as Record<string, unknown>).areaIds);
  if (parsedAreas.error || !parsedAreas.areaIds) {
    return apiFail(parsedAreas.error || "areaIds are required", 400);
  }

  await savePlayerDeviceForHunt(device.deviceId, device.fcmToken);
  const replaced = await replaceDeviceAreas(device.deviceId, parsedAreas.areaIds);
  if ("error" in replaced && replaced.error) return apiFail(replaced.error, 400);

  const areas = await prisma.huntArea.findMany({
    where: { id: { in: parsedAreas.areaIds } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return apiOk({
    areaIds: parsedAreas.areaIds,
    areas: areas.map(serializeHuntArea),
    areaSelectionRequired: false,
  });
}
