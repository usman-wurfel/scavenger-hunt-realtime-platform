export { dynamic } from "@/lib/api-route";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { serializeEventParticipant } from "@/lib/events";
import { markFirstPlaceClaimed } from "@/lib/winner-prize";

type RouteContext = {
  params: Promise<{ id: string; participantId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id: huntId, participantId } = await context.params;
    const result = await markFirstPlaceClaimed({ huntId, participantId });

    if ("error" in result) {
      const message = result.error ?? "Failed to mark prize as claimed";
      const status = message === "Participant not found" ? 404 : 400;
      return apiFail(message, status);
    }

    return apiOk({
      message: result.alreadyClaimed ? "Already claimed" : "Marked as claimed",
      participant: serializeEventParticipant(result.participant),
    });
  } catch {
    return apiFail("Failed to mark prize as claimed", 500);
  }
}
