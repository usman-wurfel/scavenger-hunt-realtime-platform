import { SignJWT, jwtVerify } from "jose";

const MQTT_TOKEN_EXPIRY = "12h";

export type MqttAuthRole = "player" | "admin";

export type MqttAuthClaims = {
  huntId: string;
  role: MqttAuthRole;
  deviceId?: string;
};

function getMqttAuthSecret(): Uint8Array {
  const secret = process.env.MQTT_AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("MQTT_AUTH_SECRET or JWT_SECRET must be configured");
  }

  return new TextEncoder().encode(secret);
}

export async function createMqttAuthToken(claims: MqttAuthClaims): Promise<string> {
  const builder = new SignJWT({
    role: claims.role,
    deviceId: claims.deviceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.huntId)
    .setIssuedAt()
    .setExpirationTime(MQTT_TOKEN_EXPIRY);

  return builder.sign(getMqttAuthSecret());
}

export async function verifyMqttAuthToken(
  token: string,
): Promise<MqttAuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getMqttAuthSecret());
    const huntId = typeof payload.sub === "string" ? payload.sub : "";
    const role = payload.role === "admin" ? "admin" : payload.role === "player" ? "player" : null;
    const deviceId = typeof payload.deviceId === "string" ? payload.deviceId : undefined;

    if (!huntId || !role) {
      return null;
    }

    if (role === "player" && !deviceId) {
      return null;
    }

    return { huntId, role, deviceId };
  } catch {
    return null;
  }
}
