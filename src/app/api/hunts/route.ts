export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";
import { EventStatus } from "@prisma/client";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiFailFromError, apiOk, isApiDebugEnabled } from "@/lib/api-response";
import { generateEventQrCode } from "@/lib/event-qr";
import {
  buildEventsWhere,
  generateEventCode,
  parseCreateEventInput,
  parseEventListQuery,
  serializeEvent,
  serializeEventListItem,
  toDbEventStatus,
} from "@/lib/events";
import { resolveProximityAlertsFromIds } from "@/lib/events-server";
import { clearHuntsLive, initializeStartedHuntLive } from "@/lib/mqtt/hunt-lifecycle";
import {
  notifyHuntStartedPush,
  notifyHuntsEndedPush,
} from "@/lib/push-notifications/notify";
import { scheduleHuntStartJob } from "@/lib/queue/hunt-start-queue";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/settings";

const MAX_CODE_ATTEMPTS = 10;

const eventListInclude = {
  area: true,
  _count: { select: { proximityAlerts: true, participants: true } },
} as const;

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const { page, pageSize, search } = parseEventListQuery(request.nextUrl.searchParams);
  const where = buildEventsWhere(search);

  const [total, events] = await Promise.all([
    prisma.huntEvent.count({ where }),
    prisma.huntEvent.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
      include: eventListInclude,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return apiOk({
    hunts: events.map(serializeEventListItem),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}

async function resolveEventCode(requestedCode: string, userProvided: boolean) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = attempt === 0 ? requestedCode : generateEventCode();
    const existing = await prisma.huntEvent.findUnique({
      where: { eventCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }

    if (userProvided) {
      return null;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const body = await request.json();
    const userProvidedCode =
      (typeof body?.huntCode === "string" && body.huntCode.trim() !== "") ||
      (typeof body?.eventCode === "string" && body.eventCode.trim() !== "");

    // Warm timezone cache from settings before parsing schedule times.
    const settings = await getOrCreateSettings();
    const parsed = parseCreateEventInput(body);
    if (parsed.error || !parsed.data) {
      return apiFail(parsed.error || "Invalid event", 400);
    }

    const input = parsed.data;

    if (input.areaId) {
      const area = await prisma.huntArea.findFirst({
        where: { id: input.areaId, isActive: true },
        select: { id: true },
      });
      if (!area) return apiFail("Selected area is invalid or inactive", 400);
    }

    const resolvedAlerts = await resolveProximityAlertsFromIds(input.proximityAlertIds);
    if (resolvedAlerts.error || !resolvedAlerts.data) {
      return apiFail(resolvedAlerts.error || "Invalid proximity alerts", 400);
    }

    const proximityAlerts = resolvedAlerts.data;
    const eventCode = await resolveEventCode(input.huntCode, userProvidedCode);

    if (!eventCode) {
      return apiFail("Hunt code already exists. Please choose another code.", 400);
    }

    const qrCodeUrl = await generateEventQrCode(eventCode);
    const playerNearbyRadius =
      input.playerNearbyRadiusFt ?? settings.playerNearbyRadius;
    const isImmediateStart = input.status === "started";
    let endedHuntIds: string[] = [];

    const event = await prisma.$transaction(async (tx) => {
      if (isImmediateStart) {
        const runningHunts = await tx.huntEvent.findMany({
          where: { status: EventStatus.STARTED },
          select: { id: true },
        });
        endedHuntIds = runningHunts.map((hunt) => hunt.id);

        await tx.huntEvent.updateMany({
          where: { status: EventStatus.STARTED },
          data: { status: EventStatus.ENDED, endedAt: new Date() },
        });
      }

      return tx.huntEvent.create({
        data: {
          ...(input.areaId ? { areaId: input.areaId } : {}),
          eventName: input.huntName,
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          eventDate: new Date(`${input.huntDate}T00:00:00.000Z`),
          eventTime: input.huntTime,
          timezone: input.timezone,
          eventCode,
          playerClue: input.playerClue,
          playerNearbyRadius,
          status: toDbEventStatus(input.status),
          qrCodeUrl,
          proximityAlerts: {
            create: proximityAlerts.map((alert, index) => ({
              alertTypeId: alert.alertTypeId,
              distanceFt: alert.distanceFt,
              message: alert.message,
              messageColor: alert.messageColor,
              sortOrder: proximityAlerts.length - index,
            })),
          },
        },
        include: {
          area: true,
          proximityAlerts: true,
        },
      });
    });

    if (isImmediateStart) {
      await clearHuntsLive(endedHuntIds);
      await initializeStartedHuntLive(event.id);
      await notifyHuntsEndedPush(endedHuntIds);
      await notifyHuntStartedPush(event.id);
    }

    if (input.status === "scheduled") {
      try {
        await scheduleHuntStartJob(event.id, event.eventDate, event.eventTime, event.timezone, {
          allowImmediateReminder: true,
          resetReminderNotified: true,
        });
      } catch (queueError) {
        console.error("[api] Hunt created but queue scheduling failed", queueError);
        if (isApiDebugEnabled()) {
          return apiFailFromError(
            "Event created but failed to schedule auto-start job",
            queueError,
            500,
          );
        }
      }
    }

    return apiOk({ hunt: serializeEvent(event) }, { status: 201 });
  } catch (error) {
    return apiFailFromError("Failed to create event", error, 500);
  }
}
