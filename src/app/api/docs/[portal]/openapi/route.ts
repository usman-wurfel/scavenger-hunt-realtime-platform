export { dynamic } from "@/lib/api-route";

import { NextResponse } from "next/server";

import { apiFail } from "@/lib/api-response";
import { enrichOpenApiSpec, getOpenApiSpec, isApiPortal, resolveSwaggerServerUrl } from "@/lib/swagger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ portal: string }> }
) {
  const { portal } = await params;

  if (!isApiPortal(portal)) {
    return apiFail("Unknown API portal", 404);
  }

  const baseSpec = getOpenApiSpec(portal);
  if (!baseSpec) {
    return apiFail("Spec not found", 404);
  }

  const spec = enrichOpenApiSpec(baseSpec, resolveSwaggerServerUrl(request));

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
