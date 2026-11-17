export { dynamic } from "@/lib/api-route";

import { apiOk } from "@/lib/api-response";
import { serializeHuntArea } from "@/lib/hunt-areas";
import { prisma } from "@/lib/prisma";

/** Public: active areas shown in mobile onboarding/settings. */
export async function GET() {
  const areas = await prisma.huntArea.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return apiOk({ areas: areas.map(serializeHuntArea) });
}
