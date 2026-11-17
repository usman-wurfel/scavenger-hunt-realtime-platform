import { Queue } from "bullmq";

import { getScheduledHuntStartDelayMs, getAppTimezone } from "@/lib/timezone";

import { autoStartHuntById } from "./auto-start-hunt";
import { removeHuntReminderJob, scheduleHuntReminderJob } from "./hunt-reminder-queue";
import { getRedisConnectionOptions, isRedisConfigured } from "./redis";

export const HUNT_START_QUEUE_NAME = "hunt-start";
export const HUNT_START_JOB_NAME = "auto-start";

export type HuntStartJobData = {
  eventId: string;
};

const globalForQueue = globalThis as unknown as {
  huntStartQueue: Queue<HuntStartJobData> | undefined;
};

function getHuntStartQueue(): Queue<HuntStartJobData> | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!globalForQueue.huntStartQueue) {
    globalForQueue.huntStartQueue = new Queue<HuntStartJobData>(HUNT_START_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });
  }

  return globalForQueue.huntStartQueue;
}

export function huntStartJobId(eventId: string): string {
  return `hunt-start-${eventId}`;
}

export async function scheduleHuntStartJob(
  eventId: string,
  eventDate: Date | string,
  eventTime: string,
  timezone?: string,
  options?: { allowImmediateReminder?: boolean; resetReminderNotified?: boolean },
): Promise<void> {
  const queue = getHuntStartQueue();
  if (!queue) {
    console.warn("[hunt-start-queue] REDIS_URL missing — scheduled auto-start skipped");
    return;
  }

  const delay = getScheduledHuntStartDelayMs(
    eventDate,
    eventTime,
    timezone || getAppTimezone(),
  );
  if (delay === null) {
    console.warn(`[hunt-start-queue] Invalid schedule for event ${eventId}`);
    return;
  }

  await removeHuntStartJob(eventId);

  if (delay === 0) {
    void autoStartHuntById(eventId).catch((error) => {
      console.error(`[hunt-start-queue] Immediate start failed for ${eventId}`, error);
    });
    return;
  }

  await queue.add(
    HUNT_START_JOB_NAME,
    { eventId },
    {
      jobId: huntStartJobId(eventId),
      delay,
    },
  );

  await scheduleHuntReminderJob(eventId, eventDate, eventTime, timezone, {
    allowImmediate: options?.allowImmediateReminder !== false,
    resetNotified: options?.resetReminderNotified === true,
  });
}

export async function removeHuntStartJob(eventId: string): Promise<void> {
  const queue = getHuntStartQueue();
  if (queue) {
    const job = await queue.getJob(huntStartJobId(eventId));
    if (job) {
      await job.remove();
    }
  }

  await removeHuntReminderJob(eventId);
}
