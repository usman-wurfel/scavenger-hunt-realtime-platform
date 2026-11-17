export { dynamic } from "@/lib/api-route";

import { connection } from "next/server";
import { NextRequest } from "next/server";

import { apiFail, apiOk } from "@/lib/api-response";
import { getFirstPlacePrizeForDevice } from "@/lib/winner-prize";

/**
 * Player API: first-place prize status + admin message.
 * Query: deviceId + huntId
 * status: none | waiting | claimed
 */
export async function GET(request: NextRequest) {
  await connection();

  try {
    const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
    const huntId = request.nextUrl.searchParams.get("huntId")?.trim();

    if (!deviceId) {
      return apiFail("deviceId is required", 400);
    }

    if (!huntId) {
      return apiFail("huntId is required", 400);
    }

    const result = await getFirstPlacePrizeForDevice({
      deviceId,
      huntId,
    });

    if ("error" in result) {
      const message: string =
        typeof result.error === "string" && result.error.length > 0
          ? result.error
          : "Hunt not found";
      return apiFail(message, 404);
    }

    return apiOk({ prize: result });
  } catch {
    return apiFail("Failed to load prize status", 500);
  }
}
