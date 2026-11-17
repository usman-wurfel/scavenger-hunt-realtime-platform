export { dynamic } from "@/lib/api-route";

import { EventStatus } from "@prisma/client";
import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { EVENT_NOT_FOUND_MESSAGE } from "@/lib/events";
import { buildHuntPlayerPositions } from "@/lib/mqtt/live-state";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Admin: snapshot of online joined player GPS for the live map. */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { id: huntId } = await context.params;
  const hunt = await prisma.huntEvent.findUnique({
    where: { id: huntId },
    select: {
      id: true,
      status: true,
      latitude: true,
      longitude: true,
      playerNearbyRadius: true,
    },
  });

  if (!hunt) {
    return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
  }

  if (hunt.status !== EventStatus.STARTED) {
    return apiOk({
      huntId: hunt.id,
      latitude: hunt.latitude,
      longitude: hunt.longitude,
      radiusFt: hunt.playerNearbyRadius,
      event: "positions",
      at: new Date().toISOString(),
      count: 0,
      players: [],
    });
  }

  const snapshot = await buildHuntPlayerPositions(hunt.id);

  return apiOk({
    ...snapshot,
    latitude: hunt.latitude,
    longitude: hunt.longitude,
    radiusFt: hunt.playerNearbyRadius,
  });
}
