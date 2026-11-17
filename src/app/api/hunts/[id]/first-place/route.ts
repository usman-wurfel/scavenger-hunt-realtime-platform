export { dynamic } from "@/lib/api-route";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { getAdminFirstPlaceForHunt } from "@/lib/winner-prize";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Admin: first-place prize status for a hunt (mobile-friendly). */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id: huntId } = await context.params;
    const result = await getAdminFirstPlaceForHunt(huntId);

    if ("error" in result) {
      const message = result.error ?? "Failed to load first-place winner";
      const status =
        message === "Hunt not found"
          ? 404
          : message === "No first-place winner yet"
            ? 404
            : 400;
      return apiFail(message, status);
    }

    return apiOk({
      huntId: result.huntId,
      huntName: result.huntName,
      username: result.participant.username,
      status: result.status,
      winnerMessage: result.winnerMessage,
      winnerMessageSentAt: result.winnerMessageSentAt?.toISOString() ?? null,
      claimedAt: result.prizeClaimedAt?.toISOString() ?? null,
    });
  } catch {
    return apiFail("Failed to load first-place winner", 500);
  }
}
