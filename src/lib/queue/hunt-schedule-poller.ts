import { isRedisConfigured } from "@/lib/queue/redis";

import { recoverOverdueScheduledHunts } from "./recover-overdue-hunts";

const POLL_INTERVAL_MS = 15_000;

let pollerStarted = false;
let pollerTimer: ReturnType<typeof setInterval> | null = null;

async function pollOnce(): Promise<void> {
  try {
    const recovered = await recoverOverdueScheduledHunts();
    if (recovered > 0) {
      console.log(`[hunt-schedule] Poller recovered ${recovered} overdue hunt(s)`);
    }
  } catch (error) {
    console.error("[hunt-schedule] Poller failed", error);
  }
}

export function startHuntSchedulePoller(): void {
  if (pollerStarted || !isRedisConfigured()) {
    return;
  }

  pollerStarted = true;
  void pollOnce();

  pollerTimer = setInterval(() => {
    void pollOnce();
  }, POLL_INTERVAL_MS);

  console.log(`[hunt-schedule] Poller started (every ${POLL_INTERVAL_MS / 1000}s)`);
}

export function stopHuntSchedulePoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
  pollerStarted = false;
}
