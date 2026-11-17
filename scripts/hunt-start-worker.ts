import { EventStatus } from "@prisma/client";
import { Worker } from "bullmq";

import { prisma } from "@/lib/prisma";
import { autoStartHuntById } from "@/lib/queue/auto-start-hunt";
import {
  HUNT_REMINDER_JOB_NAME,
  HUNT_REMINDER_QUEUE_NAME,
  sendHuntStartingSoonForEvent,
  type HuntReminderJobData,
} from "@/lib/queue/hunt-reminder-queue";
import {
  HUNT_START_JOB_NAME,
  HUNT_START_QUEUE_NAME,
  scheduleHuntStartJob,
  type HuntStartJobData,
} from "@/lib/queue/hunt-start-queue";
import { recoverOverdueScheduledHunts } from "@/lib/queue/recover-overdue-hunts";
import { getRedisConnectionOptions, isRedisConfigured } from "@/lib/queue/redis";
import { getOrCreateSettings } from "@/lib/settings";

const RECOVER_INTERVAL_MS = 15_000;

async function syncScheduledHuntsFromDatabase() {
  const events = await prisma.huntEvent.findMany({
    where: { status: EventStatus.SCHEDULED },
    select: { id: true, eventDate: true, eventTime: true, timezone: true },
  });

  for (const event of events) {
    // Do not fan-out immediate reminders on every worker restart.
    await scheduleHuntStartJob(event.id, event.eventDate, event.eventTime, event.timezone, {
      allowImmediateReminder: false,
      resetReminderNotified: false,
    });
  }

  console.log(`[hunt-start-worker] Synced ${events.length} scheduled hunt job(s)`);
}

async function main() {
  if (!isRedisConfigured()) {
    console.error("[hunt-start-worker] REDIS_URL is not configured");
    process.exit(1);
  }

  await getOrCreateSettings();
  await syncScheduledHuntsFromDatabase();
  const recovered = await recoverOverdueScheduledHunts();
  if (recovered > 0) {
    console.log(`[hunt-start-worker] Recovered ${recovered} overdue hunt(s) on startup`);
  }

  const connection = getRedisConnectionOptions();

  const huntStartWorker = new Worker<HuntStartJobData>(
    HUNT_START_QUEUE_NAME,
    async (job) => {
      if (job.name !== HUNT_START_JOB_NAME) return;
      await autoStartHuntById(job.data.eventId);
    },
    { connection },
  );

  const huntReminderWorker = new Worker<HuntReminderJobData>(
    HUNT_REMINDER_QUEUE_NAME,
    async (job) => {
      if (job.name !== HUNT_REMINDER_JOB_NAME) return;
      const kind = job.data.kind === "5m" ? "5m" : "30m";
      await sendHuntStartingSoonForEvent(job.data.eventId, kind);
    },
    {
      connection,
      // Multiple reminder jobs (30m/5m, retries) without starving FCM fan-out.
      concurrency: 3,
    },
  );

  huntStartWorker.on("completed", (job) => {
    console.log(`[hunt-start-worker] Started hunt ${job.data.eventId}`);
  });

  huntStartWorker.on("failed", (job, error) => {
    console.error(`[hunt-start-worker] Failed hunt ${job?.data.eventId ?? "unknown"}:`, error);
  });

  huntReminderWorker.on("completed", (job) => {
    console.log(
      `[hunt-reminder] Sent starting-soon (${job.data.kind ?? "30m"}) for hunt ${job.data.eventId}`,
    );
  });

  huntReminderWorker.on("failed", (job, error) => {
    console.error(
      `[hunt-reminder] Failed starting-soon (${job?.data.kind ?? "?"}) for hunt ${job?.data.eventId ?? "unknown"}:`,
      error,
    );
  });

  setInterval(() => {
    void recoverOverdueScheduledHunts().then((count) => {
      if (count > 0) {
        console.log(`[hunt-start-worker] Recovered ${count} overdue hunt(s)`);
      }
    });
  }, RECOVER_INTERVAL_MS);

  console.log("[hunt-start-worker] Listening for scheduled hunt starts + reminders...");

  async function shutdown() {
    await Promise.all([huntStartWorker.close(), huntReminderWorker.close()]);
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[hunt-start-worker] Startup failed:", error);
  process.exit(1);
});
