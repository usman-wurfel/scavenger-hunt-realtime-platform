export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import {
  HUNT_DATETIME_AVAILABLE_MESSAGE,
  HUNT_DATETIME_UNAVAILABLE_MESSAGE,
  parseEventDatetime,
} from "@/lib/events";
import { findConflictingHuntAtDatetime } from "@/lib/events-server";

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const eventDatetime = request.nextUrl.searchParams.get("eventDatetime");
  const parsed = parseEventDatetime(eventDatetime);
  if (parsed.error || !parsed.huntDate || !parsed.huntTime) {
    return apiFail(parsed.error || "Invalid eventDatetime", 400);
  }

  const excludeHuntId = (request.nextUrl.searchParams.get("excludeHuntId") || "").trim() || undefined;

  const conflict = await findConflictingHuntAtDatetime(
    parsed.huntDate,
    parsed.huntTime,
    excludeHuntId,
  );

  if (conflict) {
    return apiFail(HUNT_DATETIME_UNAVAILABLE_MESSAGE, 409);
  }

  return apiOk({
    available: true,
    message: HUNT_DATETIME_AVAILABLE_MESSAGE,
    huntDate: parsed.huntDate,
    huntTime: parsed.huntTime,
  });
}
