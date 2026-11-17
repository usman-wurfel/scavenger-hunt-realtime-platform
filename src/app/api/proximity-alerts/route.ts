export { dynamic } from "@/lib/api-route";

import { requireSession } from "@/lib/api-auth";
import { apiOk } from "@/lib/api-response";
import { serializeProximityAlertTemplate } from "@/lib/proximity-alerts";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const alertTypes = await prisma.alertType.findMany({
    orderBy: { distanceFt: "desc" },
  });

  return apiOk({
    proximityAlerts: alertTypes.map(serializeProximityAlertTemplate),
  });
}
