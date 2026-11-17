export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { apiFail, apiOk } from "@/lib/api-response";
import { toAbsoluteUrlWithBase } from "@/lib/app-url";
import { createToken, COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth";
import { parseOptionalDeviceIdInput } from "@/lib/device-id";
import { parseFcmTokenInput, shouldUpdateFcmToken } from "@/lib/fcm-token";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { resolveSwaggerServerUrl } from "@/lib/swagger/helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiFail("Email and password are required", 400);
    }

    const fcmParsed = parseFcmTokenInput(body);
    if (fcmParsed.error) {
      return apiFail(fcmParsed.error, 400);
    }

    const deviceParsed = parseOptionalDeviceIdInput(body);
    if (deviceParsed.error) {
      return apiFail(deviceParsed.error, 400);
    }

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return apiFail("Invalid email or password", 401);
    }

    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return apiFail("Invalid email or password", 401);
    }

    const loginUpdates: { fcmToken?: string; deviceId?: string } = {};
    if (shouldUpdateFcmToken(admin.fcmToken, fcmParsed.fcmToken)) {
      loginUpdates.fcmToken = fcmParsed.fcmToken;
    }
    if (shouldUpdateFcmToken(admin.deviceId, deviceParsed.deviceId)) {
      loginUpdates.deviceId = deviceParsed.deviceId;
    }

    if (Object.keys(loginUpdates).length > 0) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: loginUpdates,
      });
    }

    const token = await createToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      tokenVersion: admin.tokenVersion,
    });

    const baseUrl = resolveSwaggerServerUrl(request);

    const response = apiOk({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        profilePhoto: toAbsoluteUrlWithBase(admin.profilePhoto, baseUrl),
      },
    });

    response.cookies.set(COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch {
    return apiFail("Server error. Please try again.", 500);
  }
}
