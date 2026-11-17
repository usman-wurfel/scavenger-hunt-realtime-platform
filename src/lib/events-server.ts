import { EventStatus, Prisma } from "@prisma/client";

import {
  alertTypesToProximityInputs,
  buildEventHistoryWhere,
  compareEventHistoryOrder,
  compareDashboardHuntOrder,
  eventHistoryListInclude,
  eventWithAlertsInclude,
  isScheduledHuntStartPassed,
  serializeEventHistoryItem,
  type ScheduledEventInput,
  type EventStatusValue,
  type UpdateStartedEventInput,
} from "@/lib/events";
import { deleteEventQrCodeFile, generateEventQrCode } from "@/lib/event-qr";
import { prisma } from "@/lib/prisma";
import { clearHuntsLive, initializeStartedHuntLive } from "@/lib/mqtt/hunt-lifecycle";
import {
  notifyAdminScheduledHuntStartedPush,
  notifyHuntStartedPush,
  notifyHuntsEndedPush,
} from "@/lib/push-notifications/notify";
import { getAppTimezone, getTodayDateIsoInAppTimezone } from "@/lib/timezone";

const historyStatusOrderSql = Prisma.sql`
  CASE status::text
    WHEN 'STARTED' THEN 0
    WHEN 'SCHEDULED' THEN 1
    WHEN 'ENDED' THEN 2
    ELSE 3
  END
`;

export async function resolveProximityAlertsFromIds(ids: string[]) {
  const alertTypes = await prisma.alertType.findMany({
    where: { id: { in: ids } },
    orderBy: { distanceFt: "desc" },
  });

  if (alertTypes.length !== ids.length) {
    return { error: "One or more proximity alert IDs are invalid" as const };
  }

  return { data: alertTypesToProximityInputs(alertTypes) };
}

export async function updateScheduledEvent(
  eventId: string,
  existing: {
    eventCode: string;
    qrCodeUrl: string | null;
    playerNearbyRadius: number;
  },
  input: ScheduledEventInput,
) {
  if (input.areaId) {
    const area = await prisma.huntArea.findFirst({
      where: { id: input.areaId, isActive: true },
      select: { id: true },
    });
    if (!area) {
      return { error: "Selected area is invalid or inactive" as const };
    }
  }

  const resolvedAlerts = await resolveProximityAlertsFromIds(input.proximityAlertIds);
  if (resolvedAlerts.error || !resolvedAlerts.data) {
    return { error: resolvedAlerts.error || "Invalid proximity alerts" as const };
  }

  if (input.huntCode !== existing.eventCode) {
    const duplicate = await prisma.huntEvent.findFirst({
      where: {
        eventCode: input.huntCode,
        NOT: { id: eventId },
      },
      select: { id: true },
    });

    if (duplicate) {
      return { error: "Hunt code already exists. Please choose another code." as const };
    }
  }

  const proximityAlerts = resolvedAlerts.data;
  let qrCodeUrl = existing.qrCodeUrl;

  if (input.huntCode !== existing.eventCode) {
    await deleteEventQrCodeFile(existing.qrCodeUrl);
    qrCodeUrl = await generateEventQrCode(input.huntCode);
  }

  const event = await prisma.$transaction(async (tx) => {
    await tx.eventProximityAlert.deleteMany({ where: { eventId } });

    return tx.huntEvent.update({
      where: { id: eventId },
      data: {
        ...(input.areaId ? { areaId: input.areaId } : {}),
        eventName: input.huntName,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        eventDate: new Date(`${input.huntDate}T00:00:00.000Z`),
        eventTime: input.huntTime,
        timezone: input.timezone,
        eventCode: input.huntCode,
        playerClue: input.playerClue,
        playerNearbyRadius: input.playerNearbyRadiusFt ?? existing.playerNearbyRadius,
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
      include: eventWithAlertsInclude,
    });
  });

  return { event };
}

export async function updateStartedEvent(eventId: string, input: UpdateStartedEventInput) {
  const event = await prisma.huntEvent.update({
    where: { id: eventId },
    data: {
      ...(input.playerClue !== undefined ? { playerClue: input.playerClue } : {}),
      ...(input.playerNearbyRadiusFt !== undefined
        ? { playerNearbyRadius: input.playerNearbyRadiusFt }
        : {}),
    },
    include: eventWithAlertsInclude,
  });

  return { event };
}

export async function findDashboardHuntsForToday(now = new Date()) {
  const todayIso = getTodayDateIsoInAppTimezone(now);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);

  const events = await prisma.huntEvent.findMany({
    where: {
      OR: [
        { status: EventStatus.STARTED },
        {
          eventDate: todayDate,
          status: EventStatus.SCHEDULED,
        },
      ],
    },
    include: eventHistoryListInclude,
  });

  events.sort(compareDashboardHuntOrder);

  return events.map(serializeEventHistoryItem);
}

export async function endAllStartedHunts(excludeEventId?: string, endedAt = new Date()) {
  const huntsToEnd = await prisma.huntEvent.findMany({
    where: {
      status: EventStatus.STARTED,
      ...(excludeEventId ? { NOT: { id: excludeEventId } } : {}),
    },
    select: { id: true },
  });

  await prisma.huntEvent.updateMany({
    where: {
      status: EventStatus.STARTED,
      ...(excludeEventId ? { NOT: { id: excludeEventId } } : {}),
    },
    data: { status: EventStatus.ENDED, endedAt },
  });

  await clearHuntsLive(huntsToEnd.map((hunt) => hunt.id));
}

export async function startHuntReplacingCurrent(
  eventId: string,
  options: { endRunningHunts?: boolean } = { endRunningHunts: true },
): Promise<boolean> {
  const endedAt = new Date();
  const endedHuntIds: string[] = [];

  const started = await prisma.$transaction(async (tx) => {
    const event = await tx.huntEvent.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (!event || event.status !== EventStatus.SCHEDULED) {
      return false;
    }

    if (options.endRunningHunts) {
      const runningHunts = await tx.huntEvent.findMany({
        where: { status: EventStatus.STARTED },
        select: { id: true },
      });
      endedHuntIds.push(...runningHunts.map((hunt) => hunt.id));

      await tx.huntEvent.updateMany({
        where: { status: EventStatus.STARTED },
        data: { status: EventStatus.ENDED, endedAt },
      });
    } else {
      const runningHunt = await tx.huntEvent.findFirst({
        where: { status: EventStatus.STARTED },
        select: { id: true },
      });

      if (runningHunt) {
        return false;
      }
    }

    await tx.huntEvent.update({
      where: { id: eventId, status: EventStatus.SCHEDULED },
      data: { status: EventStatus.STARTED },
    });

    return true;
  });

  if (started) {
    await clearHuntsLive(endedHuntIds);
    await initializeStartedHuntLive(eventId);
    await notifyHuntsEndedPush(endedHuntIds);
    await notifyHuntStartedPush(eventId);
    await notifyAdminScheduledHuntStartedPush(eventId);
  }

  return started;
}

export async function findTodayScheduledHunts(now = new Date()) {
  const todayIso = getTodayDateIsoInAppTimezone(now);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);

  return prisma.huntEvent.findMany({
    where: {
      status: EventStatus.SCHEDULED,
      eventDate: todayDate,
    },
    include: eventWithAlertsInclude,
    orderBy: [{ eventTime: "asc" }],
  });
}

export async function findStartedHunt() {
  return prisma.huntEvent.findFirst({
    where: { status: EventStatus.STARTED },
    include: eventWithAlertsInclude,
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function findActiveHunt() {
  const started = await prisma.huntEvent.findFirst({
    where: { status: EventStatus.STARTED },
    include: eventWithAlertsInclude,
    orderBy: [{ updatedAt: "desc" }],
  });

  if (started) return started;

  return prisma.huntEvent.findFirst({
    where: { status: EventStatus.SCHEDULED },
    include: eventWithAlertsInclude,
    orderBy: [{ eventDate: "asc" }, { eventTime: "asc" }],
  });
}

export async function findConflictingHuntAtDatetime(
  huntDate: string,
  huntTime: string,
  excludeHuntId?: string,
) {
  const candidates = await prisma.huntEvent.findMany({
    where: {
      eventDate: new Date(`${huntDate}T00:00:00.000Z`),
      eventTime: huntTime,
      status: { in: [EventStatus.SCHEDULED, EventStatus.STARTED] },
      ...(excludeHuntId ? { NOT: { id: excludeHuntId } } : {}),
    },
    select: {
      id: true,
      eventName: true,
      status: true,
      eventDate: true,
      eventTime: true,
    },
  });

  const now = new Date();
  const timezone = getAppTimezone();

  return (
    candidates.find(
      (hunt) =>
        hunt.status === EventStatus.STARTED ||
        !isScheduledHuntStartPassed(hunt.eventDate, hunt.eventTime, timezone, now),
    ) ?? null
  );
}

export async function isHuntCodeAvailable(
  huntCode: string,
  excludeHuntId?: string,
): Promise<boolean> {
  const existing = await prisma.huntEvent.findUnique({
    where: { eventCode: huntCode },
    select: { id: true },
  });

  if (!existing) return true;
  if (excludeHuntId && existing.id === excludeHuntId) return true;
  return false;
}

export async function fetchEventHistoryPage(
  search: string,
  page: number,
  pageSize: number,
  type: EventStatusValue | null,
) {
  const where = buildEventHistoryWhere(search, type);

  if (type || where) {
    const [total, events] = await Promise.all([
      prisma.huntEvent.count({ where }),
      prisma.huntEvent.findMany({
        where,
        include: eventHistoryListInclude,
        ...(type
          ? { orderBy: [{ eventDate: "desc" }, { eventTime: "desc" }] }
          : {}),
        ...(type ? { skip: page * pageSize, take: pageSize } : {}),
      }),
    ]);

    if (!type) {
      events.sort(compareEventHistoryOrder);
      const pageItems = events.slice(page * pageSize, page * pageSize + pageSize);
      return {
        total,
        events: pageItems.map(serializeEventHistoryItem),
      };
    }

    return {
      total,
      events: events.map(serializeEventHistoryItem),
    };
  }

  const [countResult, idRows] = await Promise.all([
    prisma.$queryRaw<[{ count: number }]>`SELECT COUNT(*)::int AS count FROM "HuntEvent"`,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "HuntEvent"
      ORDER BY ${historyStatusOrderSql}, "eventDate" DESC, "eventTime" DESC
      LIMIT ${pageSize} OFFSET ${page * pageSize}
    `,
  ]);

  const total = countResult[0]?.count ?? 0;
  const ids = idRows.map((row) => row.id);

  if (ids.length === 0) {
    return { total, events: [] };
  }

  const events = await prisma.huntEvent.findMany({
    where: { id: { in: ids } },
    include: eventHistoryListInclude,
  });
  const byId = new Map(events.map((event) => [event.id, event]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((event): event is (typeof events)[number] => !!event);

  return {
    total,
    events: ordered.map(serializeEventHistoryItem),
  };
}
