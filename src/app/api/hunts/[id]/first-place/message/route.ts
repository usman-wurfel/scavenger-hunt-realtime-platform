export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import {
  sendFirstPlaceWinnerMessageByHunt,
  serializePrizeClaimStatus,
} from "@/lib/winner-prize";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Admin: send prize destination message to the hunt's first-place winner.
 * Auto-resolves scanRank === 1 — no participantId required (mobile-friendly).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id: huntId } = await context.params;
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message : "";

    const result = await sendFirstPlaceWinnerMessageByHunt({ huntId, message });

    if ("error" in result) {
      const errorMessage = result.error ?? "Failed to send winner message";
      const status =
        errorMessage === "Hunt not found" || errorMessage === "No first-place winner yet"
          ? 404
          : 400;
      return apiFail(errorMessage, status);
    }

    return apiOk({
      message: "Winner message sent",
      status: serializePrizeClaimStatus(result.participant.prizeClaimStatus),
      winnerMessage: result.participant.winnerMessage,
    });
  } catch (err) {
    console.error("[first-place/message]", err);
    return apiFail("Failed to send winner message", 500);
  }
}
