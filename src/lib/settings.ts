import { prisma } from "./prisma";
import { setAppTimezoneCache } from "./timezone";

const DEFAULT_SETTINGS_ID = "default";

export async function getOrCreateSettings() {
  const existing = await prisma.appSettings.findUnique({
    where: { id: DEFAULT_SETTINGS_ID },
  });

  if (existing) {
    setAppTimezoneCache(existing.timezone);
    return existing;
  }

  const created = await prisma.appSettings.create({
    data: { id: DEFAULT_SETTINGS_ID },
  });
  setAppTimezoneCache(created.timezone);
  return created;
}
