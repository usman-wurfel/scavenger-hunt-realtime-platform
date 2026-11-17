export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { parseEventHistoryQuery } from "@/lib/events";
import { fetchEventHistoryPage } from "@/lib/events-server";

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const parsed = parseEventHistoryQuery(request.nextUrl.searchParams);
  if ("error" in parsed) {
    return apiFail(parsed.error, 400);
  }

  const { page, pageSize, search, type } = parsed.data;
  const { total, events: hunts } = await fetchEventHistoryPage(search, page, pageSize, type);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return apiOk({
    hunts,
    pagination: {
      page: page + 1,
      pageSize,
      total,
      totalPages,
    },
  });
}
