const MIN_DEVICE_ID_LENGTH = 8;
const MAX_DEVICE_ID_LENGTH = 128;

export function parseOptionalDeviceIdInput(
  body: unknown,
): { deviceId?: string; error?: string } {
  if (!body || typeof body !== "object") {
    return {};
  }

  const raw = (body as Record<string, unknown>).deviceId;
  if (raw === undefined || raw === null) {
    return {};
  }

  if (typeof raw !== "string") {
    return { error: "deviceId must be a string" };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.length < MIN_DEVICE_ID_LENGTH || trimmed.length > MAX_DEVICE_ID_LENGTH) {
    return {
      error: `deviceId must be between ${MIN_DEVICE_ID_LENGTH} and ${MAX_DEVICE_ID_LENGTH} characters`,
    };
  }

  return { deviceId: trimmed };
}
