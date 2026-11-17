export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";

import { parseAlertTypeInput, serializeAlertType } from "@/lib/alert-types";
import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { id } = await context.params;
  const alertType = await prisma.alertType.findUnique({ where: { id } });

  if (!alertType) {
    return apiFail("Alert not found", 404);
  }

  return apiOk({ alertType: serializeAlertType(alertType) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await prisma.alertType.findUnique({ where: { id } });

    if (!existing) {
      return apiFail("Alert not found", 404);
    }

    const body = await request.json();
    const parsed = parseAlertTypeInput(body);
    if (parsed.error || !parsed.data) {
      return apiFail(parsed.error || "Invalid alert", 400);
    }

    const duplicate = await prisma.alertType.findFirst({
      where: {
        distanceFt: parsed.data.distanceFt,
        NOT: { id },
      },
    });

    if (duplicate) {
      return apiFail("An alert for this distance already exists", 400);
    }

    const alertType = await prisma.alertType.update({
      where: { id },
      data: parsed.data,
    });

    return apiOk({ alertType: serializeAlertType(alertType) });
  } catch {
    return apiFail("Failed to update alert", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await prisma.alertType.findUnique({ where: { id } });

    if (!existing) {
      return apiFail("Alert not found", 404);
    }

    await prisma.alertType.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch {
    return apiFail("Failed to delete alert", 500);
  }
}
