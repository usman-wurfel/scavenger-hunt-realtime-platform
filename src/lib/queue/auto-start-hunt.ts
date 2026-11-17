import { startHuntReplacingCurrent } from "@/lib/events-server";

export async function autoStartHuntById(eventId: string): Promise<void> {
  const started = await startHuntReplacingCurrent(eventId, { endRunningHunts: true });

  if (started) {
    console.log(`[auto-start] Hunt ${eventId} started; all previously started hunts were ended`);
    return;
  }

  console.warn(`[auto-start] Hunt ${eventId} was not started (missing or not scheduled)`);
}
