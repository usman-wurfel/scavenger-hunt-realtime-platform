export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { parseAreaInput, serializeHuntArea } from "@/lib/hunt-areas";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await context.params;

  const parsed = parseAreaInput(await request.json());
  if (parsed.error || !parsed.data) return apiFail(parsed.error || "Invalid area", 400);

  try {
    const area = await prisma.huntArea.update({ where: { id }, data: parsed.data });
    return apiOk({ area: serializeHuntArea(area) });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError) {
      if (cause.code === "P2025") return apiFail("Area not found", 404);
      if (cause.code === "P2002") {
        return apiFail("An area with this name or slug already exists", 409);
      }
    }
    return apiFail("Failed to update area", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await context.params;

  const area = await prisma.huntArea.findUnique({
    where: { id },
    include: { _count: { select: { hunts: true } } },
  });
  if (!area) return apiFail("Area not found", 404);
  if (area._count.hunts > 0) {
    return apiFail("This area is assigned to hunts. Disable it instead of deleting it.", 409);
  }

  await prisma.huntArea.delete({ where: { id } });
  return apiOk({ message: "Area deleted" });
}
