export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { fetchDashboardHuntList, parseDashboardHuntListQuery } from "@/lib/dashboard-server";

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const parsed = parseDashboardHuntListQuery(request.nextUrl.searchParams);
  if ("error" in parsed) {
    return apiFail(parsed.error, 400);
  }

  const result = await fetchDashboardHuntList(parsed.data);

  return apiOk(result);
}
