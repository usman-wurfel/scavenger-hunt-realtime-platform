export { dynamic } from "@/lib/api-route";

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireSession } from "@/lib/api-auth";
import { apiFail, apiOk } from "@/lib/api-response";
import { parseAreaInput, serializeHuntArea } from "@/lib/hunt-areas";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const areas = await prisma.huntArea.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { hunts: true, subscriptions: true } } },
  });

  return apiOk({
    areas: areas.map((area) => ({
      ...serializeHuntArea(area),
      huntCount: area._count.hunts,
      subscriberCount: area._count.subscriptions,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const parsed = parseAreaInput(await request.json());
  if (parsed.error || !parsed.data) return apiFail(parsed.error || "Invalid area", 400);

  try {
    const area = await prisma.huntArea.create({ data: parsed.data });
    return apiOk({ area: serializeHuntArea(area) }, { status: 201 });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
      return apiFail("An area with this name or slug already exists", 409);
    }
    return apiFail("Failed to create area", 500);
  }
}
