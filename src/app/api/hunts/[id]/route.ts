export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { deleteEventQrCodeFile } from "@/lib/event-qr";
import { buildHuntMqttConnectionInfo, clearHuntLive } from "@/lib/mqtt/hunt-lifecycle";
import {
  buildParticipantsWhere,
  EVENT_NOT_FOUND_MESSAGE,
  EVENT_START_INVALID_MESSAGE,
  EVENT_UPDATE_ENDED_MESSAGE,
  eventWithAlertsInclude,
  hasScheduledDateTimeChanged,
  parseParticipantListQuery,
  parseUpdateScheduledEventInput,
  parseUpdateStartedEventInput,
  participantOrderBy,
  serializeEvent,
  serializeEventDetail,
} from "@/lib/events";
import {
  startHuntReplacingCurrent,
  updateScheduledEvent,
  updateStartedEvent,
} from "@/lib/events-server";
import { removeHuntStartJob, scheduleHuntStartJob } from "@/lib/queue/hunt-start-queue";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/settings";
import { EventStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await context.params;
  const { page, pageSize, search } = parseParticipantListQuery(request.nextUrl.searchParams);
  const participantWhere = buildParticipantsWhere(id, search);

  const event = await prisma.huntEvent.findUnique({
    where: { id },
    include: { area: true, proximityAlerts: true },
  });

  if (!event) {
    return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
  }

  const [participantCount, participants] = await Promise.all([
    prisma.huntParticipant.count({ where: participantWhere }),
    prisma.huntParticipant.findMany({
      where: participantWhere,
      orderBy: [...participantOrderBy],
      skip: page * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = participantCount === 0 ? 0 : Math.ceil(participantCount / pageSize);

  const mqtt =
    event.status === EventStatus.STARTED
      ? await buildHuntMqttConnectionInfo({
          huntId: event.id,
          role: "admin",
        })
      : null;

  return apiOk({
    hunt: serializeEventDetail(event, participants, {
      page: page + 1,
      pageSize,
      total: participantCount,
      totalPages,
    }, participantCount),
    mqtt,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await prisma.huntEvent.findUnique({ where: { id } });

    if (!existing) {
      return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
    }

    if (existing.status === EventStatus.ENDED) {
      return apiFail(EVENT_UPDATE_ENDED_MESSAGE, 400);
    }

    const body = await request.json();

    if (existing.status === EventStatus.SCHEDULED) {
      await getOrCreateSettings();
      const parsed = parseUpdateScheduledEventInput(body, existing.eventCode);
      if (parsed.error || !parsed.data) {
        return apiFail(parsed.error || "Invalid event", 400);
      }

      const result = await updateScheduledEvent(id, existing, parsed.data);
      if (result.error || !result.event) {
        return apiFail(result.error || "Failed to update event", 400);
      }

      // Same as create: editing can also start the hunt immediately.
      if (parsed.status === "started") {
        await removeHuntStartJob(id);

        const started = await startHuntReplacingCurrent(id);
        if (!started) {
          return apiFail(EVENT_START_INVALID_MESSAGE, 400);
        }

        const startedEvent = await prisma.huntEvent.findUnique({
          where: { id },
          include: eventWithAlertsInclude,
        });

        if (!startedEvent) {
          return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
        }

        return apiOk({ hunt: serializeEvent(startedEvent) });
      }

      if (hasScheduledDateTimeChanged(existing, parsed.data)) {
        await scheduleHuntStartJob(
          result.event.id,
          result.event.eventDate,
          result.event.eventTime,
          result.event.timezone,
          { allowImmediateReminder: true, resetReminderNotified: true },
        );
      }

      return apiOk({ hunt: serializeEvent(result.event) });
    }

    const parsed = parseUpdateStartedEventInput(body);
    if (parsed.error || !parsed.data) {
      return apiFail(parsed.error || "Invalid event", 400);
    }

    const result = await updateStartedEvent(id, parsed.data);
    return apiOk({ hunt: serializeEvent(result.event) });
  } catch {
    return apiFail("Failed to update event", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await prisma.huntEvent.findUnique({ where: { id } });

    if (!existing) {
      return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
    }

    if (existing.status === EventStatus.SCHEDULED) {
      await removeHuntStartJob(id);
    }

    await deleteEventQrCodeFile(existing.qrCodeUrl);
    await prisma.huntEvent.delete({ where: { id } });
    await clearHuntLive(id);

    return apiOk({ deleted: true });
  } catch {
    return apiFail("Failed to delete hunt", 500);
  }
}
