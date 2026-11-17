export { dynamic } from "@/lib/api-route";

import { apiOk } from "@/lib/api-response";
import { toAbsoluteUrl } from "@/lib/app-url";
import { getOrCreateSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getOrCreateSettings();
  const updatedAt = settings.updatedAt.toISOString();

  return apiOk({
    appName: settings.appName,
    logo: toAbsoluteUrl(settings.logo),
    favicon: toAbsoluteUrl(settings.favicon),
    copyrightText: settings.copyrightText,
    updatedAt,
  });
}
