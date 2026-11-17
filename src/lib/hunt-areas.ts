import { prisma } from "@/lib/prisma";

export type HuntAreaRecord = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

export const AREA_SELECTION_REQUIRED_MESSAGE =
  "Please select at least one hunt area before viewing area-specific hunts.";
export const HUNT_NOT_AVAILABLE_IN_AREA_MESSAGE =
  "This hunt is not available for your selected areas.";

export function serializeHuntArea(area: HuntAreaRecord): HuntAreaRecord {
  return {
    id: area.id,
    name: area.name,
    slug: area.slug,
    isActive: area.isActive,
    sortOrder: area.sortOrder,
  };
}

export function normalizeAreaSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function parseAreaInput(body: unknown): {
  data?: { name: string; slug: string; isActive: boolean; sortOrder: number };
  error?: string;
} {
  if (!body || typeof body !== "object") return { error: "Invalid request body" };
  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return { error: "Area name must be between 2 and 80 characters" };
  }

  const slugSource =
    typeof record.slug === "string" && record.slug.trim() ? record.slug : name;
  const slug = normalizeAreaSlug(slugSource);
  if (!slug) return { error: "Area slug is invalid" };

  const sortOrder =
    record.sortOrder === undefined || record.sortOrder === null
      ? 0
      : Number(record.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    return { error: "sortOrder must be an integer between 0 and 10000" };
  }

  return {
    data: {
      name,
      slug,
      isActive: typeof record.isActive === "boolean" ? record.isActive : true,
      sortOrder,
    },
  };
}

export function parseAreaIds(value: unknown): { areaIds?: string[]; error?: string } {
  if (!Array.isArray(value)) return { error: "areaIds must be an array" };
  const areaIds = [...new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")))];
  if (areaIds.some((id) => !id)) return { error: "areaIds contains an invalid value" };
  if (areaIds.length === 0) return { error: "Select at least one area" };
  if (areaIds.length > 20) return { error: "A maximum of 20 areas can be selected" };
  return { areaIds };
}

export async function getDeviceAreaIds(deviceId: string): Promise<string[]> {
  const rows = await prisma.playerAreaSubscription.findMany({
    where: { deviceId },
    select: { areaId: true },
  });
  return rows.map((row) => row.areaId);
}

export async function replaceDeviceAreas(deviceId: string, areaIds: string[]) {
  const activeAreas = await prisma.huntArea.findMany({
    where: { id: { in: areaIds }, isActive: true },
    select: { id: true },
  });
  if (activeAreas.length !== areaIds.length) {
    return { error: "One or more selected areas are invalid or inactive" as const };
  }

  await prisma.$transaction([
    prisma.playerAreaSubscription.deleteMany({ where: { deviceId } }),
    prisma.playerAreaSubscription.createMany({
      data: areaIds.map((areaId) => ({ deviceId, areaId })),
      skipDuplicates: true,
    }),
  ]);

  return { areaIds };
}

export async function deviceCanAccessHunt(deviceId: string, huntAreaId: string | null) {
  // Legacy hunts created before Areas remain globally available during rollout.
  if (!huntAreaId) return true;
  const subscription = await prisma.playerAreaSubscription.findFirst({
    where: {
      deviceId,
      areaId: huntAreaId,
      area: { isActive: true },
    },
    select: { id: true },
  });
  return !!subscription;
}
