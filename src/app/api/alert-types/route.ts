export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import {
  buildAlertTypesWhere,
  parseAlertTypesListQuery,
  parseAlertTypeInput,
  serializeAlertType,
} from "@/lib/alert-types";
import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const { page, pageSize, search } = parseAlertTypesListQuery(request.nextUrl.searchParams);
  const where = buildAlertTypesWhere(search);

  const [total, alertTypes] = await Promise.all([
    prisma.alertType.count({ where }),
    prisma.alertType.findMany({
      where,
      orderBy: { distanceFt: "desc" },
      skip: page * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return apiOk({
    alertTypes: alertTypes.map(serializeAlertType),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = parseAlertTypeInput(body);
    if (parsed.error || !parsed.data) {
      return apiFail(parsed.error || "Invalid alert", 400);
    }

    const existing = await prisma.alertType.findUnique({
      where: { distanceFt: parsed.data.distanceFt },
    });

    if (existing) {
      return apiFail("An alert for this distance already exists", 400);
    }

    const alertType = await prisma.alertType.create({
      data: parsed.data,
    });

    return apiOk({ alertType: serializeAlertType(alertType) }, { status: 201 });
  } catch {
    return apiFail("Failed to create alert", 500);
  }
}
