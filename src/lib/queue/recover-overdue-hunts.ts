import { EventStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAppTimezone, getScheduledHuntStartAt } from "@/lib/timezone";

import { autoStartHuntById } from "./auto-start-hunt";
import { removeHuntStartJob } from "./hunt-start-queue";

export async function recoverOverdueScheduledHunts(now = new Date()): Promise<number> {
  const events = await prisma.huntEvent.findMany({
    where: { status: EventStatus.SCHEDULED },
    select: { id: true, eventDate: true, eventTime: true, timezone: true },
  });

  let recovered = 0;

  for (const event of events) {
    const startAt = getScheduledHuntStartAt(
      event.eventDate,
      event.eventTime,
      event.timezone || getAppTimezone(),
    );

    if (!startAt || startAt.getTime() > now.getTime()) {
      continue;
    }

    console.log(`[hunt-schedule] Starting overdue hunt ${event.id}`);
    await removeHuntStartJob(event.id);
    await autoStartHuntById(event.id);
    recovered += 1;
  }

  return recovered;
}
