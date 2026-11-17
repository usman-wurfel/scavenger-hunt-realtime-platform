import dayjs from "dayjs";
import timezonePlugin from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { EventStatus, Prisma } from "@prisma/client";

import {
  compareDashboardHuntOrder,
  eventHistoryListInclude,
  serializeEventHistoryItem,
  type EventHistoryRecord,
  type PaginationMeta,
} from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { getAppTimezone, getScheduledHuntStartAt, getTodayDateIsoInAppTimezone } from "@/lib/timezone";
import { getOrCreateSettings } from "@/lib/settings";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export type DashboardStats = {
  totalHunts: number;
  todayHunts: number;
  todayDashboardHunts: number;
  activeHunts: number;
  scheduledHunts: number;
  upcomingHunts: number;
  endedHunts: number;
  totalParticipants: number;
  todayParticipants: number;
  totalScans: number;
  todayScans: number;
  alertTypes: number;
  playerNearbyRadius: number;
};

export type DashboardDayActivity = {
  date: string;
  label: string;
  hunts: number;
  joins: number;
  scans: number;
};

export type DashboardTopHunt = {
  id: string;
  huntName: string;
  status: string;
  participantCount: number;
  scanCount: number;
};

export type DashboardOverview = {
  stats: DashboardStats;
  huntsByStatus: { scheduled: number; started: number; ended: number };
  activityLast7Days: DashboardDayActivity[];
};

export type DashboardHuntListType = "today" | "upcoming" | "ended" | "top";

export type DashboardHuntListQuery = {
  type: DashboardHuntListType;
  page: number;
  pageSize: number;
};

export type DashboardHuntListResult = {
  type: DashboardHuntListType;
  hunts?: EventHistoryRecord[];
  topHunts?: DashboardTopHunt[];
  pagination: PaginationMeta;
};

const DEFAULT_DASHBOARD_PAGE_SIZE = 6;
const MAX_DASHBOARD_PAGE_SIZE = 100;

const DASHBOARD_HUNT_LIST_TYPES: DashboardHuntListType[] = ["today", "upcoming", "ended", "top"];

function dayBounds(dateIso: string, timezone: string) {
  const start = dayjs.tz(dateIso, "YYYY-MM-DD", timezone).startOf("day").toDate();
  const end = dayjs.tz(dateIso, "YYYY-MM-DD", timezone).endOf("day").toDate();
  return { start, end };
}

function buildPagination(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages };
}

function buildTodayDashboardHuntsWhere(todayDate: Date): Prisma.HuntEventWhereInput {
  return {
    OR: [
      { status: EventStatus.STARTED },
      {
        eventDate: todayDate,
        status: EventStatus.SCHEDULED,
      },
    ],
  };
}

function isUpcomingScheduledHunt(
  event: { eventDate: Date; eventTime: string; status: EventStatus },
  now: Date,
  timezone: string,
): boolean {
  if (event.status !== EventStatus.SCHEDULED) return false;

  const startAt = getScheduledHuntStartAt(event.eventDate, event.eventTime, timezone);
  return !!startAt && startAt.getTime() > now.getTime();
}

export function parseDashboardHuntListQuery(
  searchParams: URLSearchParams,
): { data: DashboardHuntListQuery } | { error: string } {
  const rawType = searchParams.get("type");
  if (!rawType || !DASHBOARD_HUNT_LIST_TYPES.includes(rawType as DashboardHuntListType)) {
    return { error: "type is required and must be one of: today, upcoming, ended, top" };
  }

  const page = Math.max(0, Number(searchParams.get("page")) || 0);
  const pageSize = Math.min(
    MAX_DASHBOARD_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_DASHBOARD_PAGE_SIZE),
  );

  return {
    data: {
      type: rawType as DashboardHuntListType,
      page,
      pageSize,
    },
  };
}

async function countUpcomingHunts(now: Date, timezone: string): Promise<number> {
  const todayIso = getTodayDateIsoInAppTimezone(now);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);

  const scheduledEvents = await prisma.huntEvent.findMany({
    where: {
      status: EventStatus.SCHEDULED,
      eventDate: { gte: todayDate },
    },
    select: { eventDate: true, eventTime: true, status: true },
  });

  return scheduledEvents.filter((event) => isUpcomingScheduledHunt(event, now, timezone)).length;
}

async function fetchTodayHuntsPage(
  page: number,
  pageSize: number,
  now: Date,
): Promise<DashboardHuntListResult> {
  const todayIso = getTodayDateIsoInAppTimezone(now);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);
  const where = buildTodayDashboardHuntsWhere(todayDate);

  const [total, events] = await Promise.all([
    prisma.huntEvent.count({ where }),
    prisma.huntEvent.findMany({
      where,
      include: eventHistoryListInclude,
    }),
  ]);

  const hunts = events
    .sort(compareDashboardHuntOrder)
    .slice(page * pageSize, page * pageSize + pageSize)
    .map(serializeEventHistoryItem);

  return {
    type: "today",
    hunts,
    pagination: buildPagination(page, pageSize, total),
  };
}

async function fetchUpcomingHuntsPage(
  page: number,
  pageSize: number,
  now: Date,
): Promise<DashboardHuntListResult> {
  const timezone = getAppTimezone();
  const todayIso = getTodayDateIsoInAppTimezone(now);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);

  const scheduledEvents = await prisma.huntEvent.findMany({
    where: {
      status: EventStatus.SCHEDULED,
      eventDate: { gte: todayDate },
    },
    include: eventHistoryListInclude,
    orderBy: [{ eventDate: "asc" }, { eventTime: "asc" }],
  });

  const upcomingEvents = scheduledEvents.filter((event) =>
    isUpcomingScheduledHunt(event, now, timezone),
  );

  const hunts = upcomingEvents
    .slice(page * pageSize, page * pageSize + pageSize)
    .map(serializeEventHistoryItem);

  return {
    type: "upcoming",
    hunts,
    pagination: buildPagination(page, pageSize, upcomingEvents.length),
  };
}

async function fetchEndedHuntsPage(page: number, pageSize: number): Promise<DashboardHuntListResult> {
  const where = { status: EventStatus.ENDED };

  const [total, events] = await Promise.all([
    prisma.huntEvent.count({ where }),
    prisma.huntEvent.findMany({
      where,
      include: eventHistoryListInclude,
      orderBy: [{ endedAt: "desc" }, { updatedAt: "desc" }],
      skip: page * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    type: "ended",
    hunts: events.map(serializeEventHistoryItem),
    pagination: buildPagination(page, pageSize, total),
  };
}

type TopHuntRow = {
  id: string;
  huntName: string;
  status: string;
  participantCount: number;
  scanCount: number;
};

async function fetchTopHuntsPage(page: number, pageSize: number): Promise<DashboardHuntListResult> {
  const total = await prisma.huntEvent.count();
  const offset = page * pageSize;

  const rows = await prisma.$queryRaw<TopHuntRow[]>(Prisma.sql`
    SELECT
      h.id,
      h."eventName" AS "huntName",
      LOWER(h.status::text) AS status,
      COUNT(p.id)::int AS "participantCount",
      COUNT(p.id) FILTER (WHERE p."scanRank" IS NOT NULL)::int AS "scanCount"
    FROM "HuntEvent" h
    LEFT JOIN "HuntParticipant" p ON p."eventId" = h.id
    GROUP BY h.id
    ORDER BY
      CASE h.status::text
        WHEN 'STARTED' THEN 0
        WHEN 'SCHEDULED' THEN 1
        ELSE 2
      END,
      COUNT(p.id) DESC,
      h."updatedAt" DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  return {
    type: "top",
    topHunts: rows,
    pagination: buildPagination(page, pageSize, total),
  };
}

export async function fetchDashboardHuntList(
  query: DashboardHuntListQuery,
  now = new Date(),
): Promise<DashboardHuntListResult> {
  const { type, page, pageSize } = query;

  if (type === "today") return fetchTodayHuntsPage(page, pageSize, now);
  if (type === "upcoming") return fetchUpcomingHuntsPage(page, pageSize, now);
  if (type === "ended") return fetchEndedHuntsPage(page, pageSize);
  return fetchTopHuntsPage(page, pageSize);
}

export async function fetchDashboardOverview(now = new Date()): Promise<DashboardOverview> {
  const timezone = getAppTimezone();
  const todayIso = getTodayDateIsoInAppTimezone(now);
  const todayDate = new Date(`${todayIso}T00:00:00.000Z`);
  const { start: todayStart, end: todayEnd } = dayBounds(todayIso, timezone);

  const [
    settings,
    totalHunts,
    todayHunts,
    todayDashboardHunts,
    activeHunts,
    scheduledHunts,
    endedHunts,
    upcomingHunts,
    totalParticipants,
    todayParticipants,
    totalScans,
    todayScans,
    alertTypes,
    last7DayHuntCounts,
    last7DayJoinCounts,
    last7DayScanCounts,
  ] = await Promise.all([
    getOrCreateSettings(),
    prisma.huntEvent.count(),
    prisma.huntEvent.count({ where: { eventDate: todayDate } }),
    prisma.huntEvent.count({ where: buildTodayDashboardHuntsWhere(todayDate) }),
    prisma.huntEvent.count({ where: { status: EventStatus.STARTED } }),
    prisma.huntEvent.count({ where: { status: EventStatus.SCHEDULED } }),
    prisma.huntEvent.count({ where: { status: EventStatus.ENDED } }),
    countUpcomingHunts(now, timezone),
    prisma.huntParticipant.count(),
    prisma.huntParticipant.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.huntParticipant.count({ where: { scanRank: { not: null } } }),
    prisma.huntParticipant.count({
      where: {
        scannedAt: { gte: todayStart, lte: todayEnd },
        scanRank: { not: null },
      },
    }),
    prisma.alertType.count(),
    Promise.all(
      Array.from({ length: 7 }, (_, index) => {
        const dateIso = dayjs(now).tz(timezone).subtract(6 - index, "day").format("YYYY-MM-DD");
        return prisma.huntEvent.count({
          where: { eventDate: new Date(`${dateIso}T00:00:00.000Z`) },
        });
      }),
    ),
    Promise.all(
      Array.from({ length: 7 }, (_, index) => {
        const dateIso = dayjs(now).tz(timezone).subtract(6 - index, "day").format("YYYY-MM-DD");
        const { start, end } = dayBounds(dateIso, timezone);
        return prisma.huntParticipant.count({
          where: { createdAt: { gte: start, lte: end } },
        });
      }),
    ),
    Promise.all(
      Array.from({ length: 7 }, (_, index) => {
        const dateIso = dayjs(now).tz(timezone).subtract(6 - index, "day").format("YYYY-MM-DD");
        const { start, end } = dayBounds(dateIso, timezone);
        return prisma.huntParticipant.count({
          where: {
            scannedAt: { gte: start, lte: end },
            scanRank: { not: null },
          },
        });
      }),
    ),
  ]);

  const activityLast7Days: DashboardDayActivity[] = Array.from({ length: 7 }, (_, index) => {
    const day = dayjs(now).tz(timezone).subtract(6 - index, "day");
    return {
      date: day.format("YYYY-MM-DD"),
      label: day.format("ddd"),
      hunts: last7DayHuntCounts[index] ?? 0,
      joins: last7DayJoinCounts[index] ?? 0,
      scans: last7DayScanCounts[index] ?? 0,
    };
  });

  return {
    stats: {
      totalHunts,
      todayHunts,
      todayDashboardHunts,
      activeHunts,
      scheduledHunts,
      upcomingHunts,
      endedHunts,
      totalParticipants,
      todayParticipants,
      totalScans,
      todayScans,
      alertTypes,
      playerNearbyRadius: settings.playerNearbyRadius,
    },
    huntsByStatus: {
      scheduled: scheduledHunts,
      started: activeHunts,
      ended: endedHunts,
    },
    activityLast7Days,
  };
}
