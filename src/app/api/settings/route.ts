export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings } from "@/lib/settings";
import { withAbsoluteSettingsUrls } from "@/lib/serialize-urls";
import { isValidTimezone, setAppTimezoneCache } from "@/lib/timezone";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const settings = await getOrCreateSettings();
  return apiOk({ settings: withAbsoluteSettingsUrls(settings) });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const body = await request.json();
    const {
      appName,
      logo,
      favicon,
      applicationLogo,
      playerNearbyRadius,
      timezone,
      copyrightText,
    } = body;

    if (!appName?.trim()) {
      return apiFail("Application name is required", 400);
    }

    const radius = Number(playerNearbyRadius);
    if (isNaN(radius) || radius < 1) {
      return apiFail("Player nearby radius must be at least 1 ft", 400);
    }

    if (typeof timezone !== "string" || !timezone.trim() || !isValidTimezone(timezone.trim())) {
      return apiFail("A valid timezone is required", 400);
    }

    const normalizedTimezone = timezone.trim();

    const settings = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        appName: appName.trim(),
        logo: logo || null,
        favicon: favicon || null,
        applicationLogo: applicationLogo || null,
        playerNearbyRadius: radius,
        timezone: normalizedTimezone,
        copyrightText: copyrightText?.trim() || "",
      },
      create: {
        id: "default",
        appName: appName.trim(),
        logo: logo || null,
        favicon: favicon || null,
        applicationLogo: applicationLogo || null,
        playerNearbyRadius: radius,
        timezone: normalizedTimezone,
        copyrightText: copyrightText?.trim() || "",
      },
    });

    setAppTimezoneCache(settings.timezone);

    return apiOk({ settings: withAbsoluteSettingsUrls(settings) });
  } catch {
    return apiFail("Failed to save settings", 500);
  }
}
