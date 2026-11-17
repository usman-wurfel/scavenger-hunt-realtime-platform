export { dynamic } from "@/lib/api-route";

import { EventStatus } from "@prisma/client";
import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import {
  EVENT_ALREADY_ENDED_MESSAGE,
  EVENT_END_INVALID_MESSAGE,
  EVENT_NOT_FOUND_MESSAGE,
  eventWithAlertsInclude,
  serializeEvent,
} from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { clearHuntLive, notifyHuntEnded } from "@/lib/mqtt/hunt-lifecycle";
import { notifyHuntEndedPush } from "@/lib/push-notifications/notify";
import { removeHuntStartJob } from "@/lib/queue/hunt-start-queue";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await context.params;
    const event = await prisma.huntEvent.findUnique({
      where: { id },
      include: eventWithAlertsInclude,
    });

    if (!event) {
      return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
    }

    if (event.status === EventStatus.ENDED) {
      return apiFail(EVENT_ALREADY_ENDED_MESSAGE, 400);
    }

    if (event.status !== EventStatus.SCHEDULED && event.status !== EventStatus.STARTED) {
      return apiFail(EVENT_END_INVALID_MESSAGE, 400);
    }

    if (event.status === EventStatus.SCHEDULED) {
      await removeHuntStartJob(id);
    }

    const endedAt = new Date();
    const updated = await prisma.huntEvent.update({
      where: { id },
      data: { status: EventStatus.ENDED, endedAt },
      include: eventWithAlertsInclude,
    });

    await notifyHuntEnded(id, endedAt);
    await clearHuntLive(id);

    if (event.status === EventStatus.STARTED) {
      await notifyHuntEndedPush(id);
    }

    return apiOk({ hunt: serializeEvent(updated) });
  } catch {
    return apiFail("Failed to end event", 500);
  }
}
