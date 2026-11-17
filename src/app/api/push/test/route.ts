export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { apiFail, apiOk, isApiDebugEnabled } from "@/lib/api-response";
import { sendTestPushToToken } from "@/lib/push-notifications/send-test";

export async function GET(request: NextRequest) {
  if (!isApiDebugEnabled()) {
    return apiFail("Push test endpoint is disabled", 404);
  }

  const fcmToken = request.nextUrl.searchParams.get("fcmToken")?.trim();
  if (!fcmToken) {
    return apiFail("fcmToken query param is required", 400);
  }

  const title = request.nextUrl.searchParams.get("title") ?? undefined;
  const body = request.nextUrl.searchParams.get("body") ?? undefined;
  const type = request.nextUrl.searchParams.get("type") ?? undefined;

  const result = await sendTestPushToToken({ fcmToken, title, body, type });

  if (!result.success) {
    return apiFail(result.error || "Failed to send test push", 502, undefined);
  }

  return apiOk({
    message: "Test push notification sent",
    messageId: result.messageId,
    fcmTokenPreview: `${fcmToken.slice(0, 12)}...${fcmToken.slice(-8)}`,
  });
}
