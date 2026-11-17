export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { apiFail, apiOk } from "@/lib/api-response";
import { verifyMqttAuthToken } from "@/lib/mqtt/auth-token";
import { isMqttAnonymousAllowed } from "@/lib/mqtt/config";

type EmqxAuthRequest = {
  username?: string;
  password?: string;
  clientid?: string;
};

export async function POST(request: NextRequest) {
  if (isMqttAnonymousAllowed()) {
    return apiOk({ result: "allow" });
  }

  try {
    const body = (await request.json()) as EmqxAuthRequest;
    const token = body.password?.trim();

    if (!token) {
      return apiOk({ result: "deny" });
    }

    const claims = await verifyMqttAuthToken(token);
    if (!claims) {
      return apiOk({ result: "deny" });
    }

    if (claims.role === "player" && claims.deviceId !== body.username) {
      return apiOk({ result: "deny" });
    }

    return apiOk({ result: "allow", is_superuser: false });
  } catch {
    return apiFail("Invalid MQTT auth payload", 400);
  }
}
