export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import {
  HUNT_CODE_AVAILABLE_MESSAGE,
  HUNT_CODE_UNAVAILABLE_MESSAGE,
  parseHuntCodeForValidation,
} from "@/lib/events";
import { isHuntCodeAvailable } from "@/lib/events-server";

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const parsed = parseHuntCodeForValidation(request.nextUrl.searchParams.get("huntCode"));
  if (parsed.error || !parsed.code) {
    return apiFail(parsed.error || "Invalid huntCode", 400);
  }

  const excludeHuntId =
    (request.nextUrl.searchParams.get("excludeHuntId") || "").trim() || undefined;

  const available = await isHuntCodeAvailable(parsed.code, excludeHuntId);
  if (!available) {
    return apiFail(HUNT_CODE_UNAVAILABLE_MESSAGE, 409);
  }

  return apiOk({
    available: true,
    message: HUNT_CODE_AVAILABLE_MESSAGE,
    huntCode: parsed.code,
  });
}
