const MAX_FCM_TOKEN_LENGTH = 512;

export function parseFcmTokenInput(
  body: unknown,
): { fcmToken?: string; error?: string } {
  if (!body || typeof body !== "object") {
    return {};
  }

  const raw = (body as Record<string, unknown>).fcmToken;
  if (raw === undefined || raw === null) {
    return {};
  }

  if (typeof raw !== "string") {
    return { error: "fcmToken must be a string" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.length > MAX_FCM_TOKEN_LENGTH) {
    return { error: `fcmToken must be at most ${MAX_FCM_TOKEN_LENGTH} characters` };
  }

  return { fcmToken: trimmed };
}

export function shouldUpdateFcmToken(
  current: string | null | undefined,
  incoming: string | undefined,
): incoming is string {
  return !!incoming && incoming !== (current ?? null);
}
