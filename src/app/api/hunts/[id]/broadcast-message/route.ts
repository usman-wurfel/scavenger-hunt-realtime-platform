export { dynamic } from "@/lib/api-route";

import { EventStatus } from "@prisma/client";
import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { EVENT_NOT_FOUND_MESSAGE } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { sendHuntBroadcastMessage } from "@/lib/push-notifications/hunt-broadcast";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Admin: broadcast a one-off message to all joined players in a started hunt (not saved). */
export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id: huntId } = await context.params;
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message : "";

    const hunt = await prisma.huntEvent.findUnique({
      where: { id: huntId },
      select: { id: true, status: true },
    });

    if (!hunt) {
      return apiFail(EVENT_NOT_FOUND_MESSAGE, 404);
    }

    if (hunt.status !== EventStatus.STARTED) {
      return apiFail("Only started hunts can broadcast messages to joined players", 400);
    }

    const result = await sendHuntBroadcastMessage({
      huntId: hunt.id,
      message,
    });

    if ("error" in result) {
      const status =
        result.error === "Hunt not found"
          ? 404
          : result.error === "Only started hunts can broadcast messages to joined players"
            ? 400
            : 400;
      return apiFail(result.error, status);
    }

    return apiOk({
      message: "Broadcast sent to joined players",
      sent: result.sent,
      failed: result.failed,
      tokens: result.tokens,
      mqtt: result.mqtt,
      players: result.players,
    });
  } catch (err) {
    console.error("[broadcast-message]", err);
    return apiFail("Failed to broadcast message", 500);
  }
}
