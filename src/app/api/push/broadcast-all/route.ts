export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { sendAppBroadcastMessage } from "@/lib/push-notifications/app-broadcast";

/**
 * Admin: broadcast a one-off FCM push to devices subscribed to one area.
 * Message is not saved. Optimized for tens of thousands of tokens.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message : "";
    const areaId = typeof body?.areaId === "string" ? body.areaId.trim() : "";
    if (!areaId) {
      return apiFail("Area is required", 400);
    }

    const area = await prisma.huntArea.findFirst({
      where: { id: areaId, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (!area) {
      return apiFail("Selected area is invalid or inactive", 400);
    }

    const result = await sendAppBroadcastMessage({ message, areaId: area.id });

    if ("error" in result) {
      return apiFail(result.error, 400);
    }

    return apiOk({
      message: `Broadcast sent to ${area.name} users`,
      area,
      sent: result.sent,
      failed: result.failed,
      tokens: result.tokens,
    });
  } catch (err) {
    console.error("[push/broadcast-all]", err);
    return apiFail("Failed to broadcast message to app users", 500);
  }
}
