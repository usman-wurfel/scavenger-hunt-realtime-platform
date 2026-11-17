export { dynamic } from "@/lib/api-route";

import { requireSession } from "@/lib/api-auth";
import { apiOk } from "@/lib/api-response";
import { fetchDashboardOverview } from "@/lib/dashboard-server";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const data = await fetchDashboardOverview();

  return apiOk(data);
}
