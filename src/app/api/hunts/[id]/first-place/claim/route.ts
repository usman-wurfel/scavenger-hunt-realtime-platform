export { dynamic } from "@/lib/api-route";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import {
  markFirstPlaceClaimedByHunt,
  serializePrizeClaimStatus,
} from "@/lib/winner-prize";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Admin: mark the hunt's first-place prize as claimed.
 * Auto-resolves scanRank === 1 — no participantId required (mobile-friendly).
 */
export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id: huntId } = await context.params;
    const result = await markFirstPlaceClaimedByHunt(huntId);

    if ("error" in result) {
      const message = result.error ?? "Failed to mark prize as claimed";
      const status =
        message === "Hunt not found" || message === "No first-place winner yet"
          ? 404
          : 400;
      return apiFail(message, status);
    }

    return apiOk({
      message: result.alreadyClaimed ? "Already claimed" : "Marked as claimed",
      status: serializePrizeClaimStatus(result.participant.prizeClaimStatus),
      claimedAt: result.participant.prizeClaimedAt?.toISOString() ?? null,
    });
  } catch {
    return apiFail("Failed to mark prize as claimed", 500);
  }
}
