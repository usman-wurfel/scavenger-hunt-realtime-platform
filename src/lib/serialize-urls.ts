import type { AppSettings } from "@prisma/client";

import { toAbsoluteUrl } from "@/lib/app-url";

type SettingsWithUrls = Pick<AppSettings, "logo" | "favicon" | "applicationLogo">;

export function withAbsoluteSettingsUrls<T extends SettingsWithUrls>(settings: T): T {
  return {
    ...settings,
    logo: toAbsoluteUrl(settings.logo),
    favicon: toAbsoluteUrl(settings.favicon),
    applicationLogo: toAbsoluteUrl(settings.applicationLogo),
  };
}

export function withAbsoluteProfilePhoto<T extends { profilePhoto: string | null }>(admin: T): T {
  return {
    ...admin,
    profilePhoto: toAbsoluteUrl(admin.profilePhoto),
  };
}
