import { EventStatus } from "@prisma/client";
import { Queue } from "bullmq";

import { prisma } from "@/lib/prisma";
import { sendHuntPushNotification } from "@/lib/push-notifications/send";
import { getAppTimezone, getScheduledHuntStartAt } from "@/lib/timezone";

import { getRedisConnectionOptions, isRedisConfigured } from "./redis";

export const HUNT_REMINDER_QUEUE_NAME = "hunt-reminder";
export const HUNT_REMINDER_JOB_NAME = "starting-soon";

export const HUNT_REMINDER_30M_MS = 30 * 60 * 1000;
export const HUNT_REMINDER_5M_MS = 5 * 60 * 1000;

export type HuntReminderKind = "30m" | "5m";

export type HuntReminderJobData = {
  eventId: string;
  kind: HuntReminderKind;
};

const globalForQueue = globalThis as unknown as {
  huntReminderQueue: Queue<HuntReminderJobData> | undefined;
};

function getHuntReminderQueue(): Queue<HuntReminderJobData> | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!globalForQueue.huntReminderQueue) {
    globalForQueue.huntReminderQueue = new Queue<HuntReminderJobData>(HUNT_REMINDER_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    });
  }

  return globalForQueue.huntReminderQueue;
}

export function huntReminderJobId(eventId: string, kind: HuntReminderKind): string {
  return `hunt-reminder-${kind}-${eventId}`;
}

export async function removeHuntReminderJob(eventId: string): Promise<void> {
  const queue = getHuntReminderQueue();
  if (!queue) return;

  for (const kind of ["30m", "5m"] as const) {
    const job = await queue.getJob(huntReminderJobId(eventId, kind));
    if (job) {
      await job.remove();
    }
  }
}

async function enqueueReminder(
  eventId: string,
  kind: HuntReminderKind,
  delayMs: number,
): Promise<void> {
  const queue = getHuntReminderQueue();
  if (!queue) {
    console.warn("[hunt-reminder] REDIS_URL missing — starting-soon reminder skipped");
    return;
  }

  await queue.add(
    HUNT_REMINDER_JOB_NAME,
    { eventId, kind },
    {
      jobId: huntReminderJobId(eventId, kind),
      delay: Math.max(0, delayMs),
    },
  );
}

/**
 * Reminder rules (as required):
 * 1) > 30 min left  → push at T-30m, then again at T-5m
 * 2) ≤ 30 and > 5   → push NOW with remaining minutes, then again at T-5m
 * 3) ≤ 5 min left   → only ONE push NOW with remaining minutes (no duplicate)
 *
 * Worker sync should pass allowImmediate: false.
 */
export async function scheduleHuntReminderJob(
  eventId: string,
  eventDate: Date | string,
  eventTime: string,
  timezone?: string,
  options?: { allowImmediate?: boolean; resetNotified?: boolean },
): Promise<void> {
  const allowImmediate = options?.allowImmediate !== false;
  const tz = timezone || getAppTimezone();

  if (options?.resetNotified) {
    await prisma.huntEvent.updateMany({
      where: { id: eventId },
      data: {
        startingSoonNotifiedAt: null,
        fiveMinuteNotifiedAt: null,
      },
    });
  }

  await removeHuntReminderJob(eventId);

  const startAt = getScheduledHuntStartAt(eventDate, eventTime, tz);
  if (!startAt) {
    console.warn(`[hunt-reminder] Invalid schedule for event ${eventId}`);
    return;
  }

  const remainingMs = startAt.getTime() - Date.now();
  if (remainingMs <= 0) {
    return;
  }

  const existing = await prisma.huntEvent.findUnique({
    where: { id: eventId },
    select: {
      status: true,
      startingSoonNotifiedAt: true,
      fiveMinuteNotifiedAt: true,
    },
  });

  if (!existing || existing.status !== EventStatus.SCHEDULED) {
    return;
  }

  const nearDelay = allowImmediate ? 500 : 1_000;

  // --- 30-minute reminder ---
  if (!existing.startingSoonNotifiedAt) {
    if (remainingMs > HUNT_REMINDER_30M_MS) {
      await enqueueReminder(eventId, "30m", remainingMs - HUNT_REMINDER_30M_MS);
    } else if (remainingMs > HUNT_REMINDER_5M_MS) {
      // Inside 30m window but before 5m: send the first reminder now.
      await enqueueReminder(eventId, "30m", nearDelay);
    }
    // If ≤ 5m: skip 30m push; only the 5m one goes out.
  }

  // --- 5-minute reminder ---
  if (!existing.fiveMinuteNotifiedAt) {
    if (remainingMs > HUNT_REMINDER_5M_MS) {
      await enqueueReminder(eventId, "5m", remainingMs - HUNT_REMINDER_5M_MS);
    } else {
      await enqueueReminder(eventId, "5m", nearDelay);
    }
  }
}

export async function sendHuntStartingSoonForEvent(
  eventId: string,
  kind: HuntReminderKind = "30m",
): Promise<void> {
  const hunt = await prisma.huntEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      eventName: true,
      eventDate: true,
      eventTime: true,
      timezone: true,
      status: true,
      startingSoonNotifiedAt: true,
      fiveMinuteNotifiedAt: true,
    },
  });

  if (!hunt || hunt.status !== EventStatus.SCHEDULED) {
    return;
  }

  const alreadySent =
    kind === "5m" ? hunt.fiveMinuteNotifiedAt != null : hunt.startingSoonNotifiedAt != null;
  if (alreadySent) {
    return;
  }

  const startAt = getScheduledHuntStartAt(hunt.eventDate, hunt.eventTime, hunt.timezone);
  if (!startAt) return;

  const remainingMs = startAt.getTime() - Date.now();
  if (remainingMs <= 0) {
    return;
  }

  const minutesUntilStart = Math.max(1, Math.ceil(remainingMs / 60_000));
  const notifiedField = kind === "5m" ? "fiveMinuteNotifiedAt" : "startingSoonNotifiedAt";

  const claimed = await prisma.huntEvent.updateMany({
    where: {
      id: eventId,
      status: EventStatus.SCHEDULED,
      [notifiedField]: null,
    },
    data: { [notifiedField]: new Date() },
  });

  if (claimed.count === 0) {
    return;
  }

  try {
    await sendHuntPushNotification(
      {
        type: "hunt_starting_soon",
        huntId: hunt.id,
        huntName: hunt.eventName,
        minutesUntilStart,
      },
      {
        // T-5m must finish ~5k devices quickly without blocking the event loop forever.
        mode: kind === "5m" ? "urgent" : "normal",
      },
    );
  } catch (error) {
    await prisma.huntEvent.updateMany({
      where: { id: eventId },
      data: { [notifiedField]: null },
    });
    throw error;
  }
}
