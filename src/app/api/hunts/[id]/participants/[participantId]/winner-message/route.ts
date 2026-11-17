export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { serializeEventParticipant } from "@/lib/events";
import { sendFirstPlaceWinnerMessage } from "@/lib/winner-prize";

type RouteContext = {
  params: Promise<{ id: string; participantId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id: huntId, participantId } = await context.params;
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message : "";

    const result = await sendFirstPlaceWinnerMessage({
      huntId,
      participantId,
      message,
    });

    if ("error" in result) {
      const errorMessage = result.error ?? "Failed to send winner message";
      const status = errorMessage === "Participant not found" ? 404 : 400;
      return apiFail(errorMessage, status);
    }

    return apiOk({
      message: "Winner message sent",
      participant: serializeEventParticipant(result.participant),
    });
  } catch (err) {
    console.error("[winner-message]", err);
    return apiFail("Failed to send winner message", 500);
  }
}
