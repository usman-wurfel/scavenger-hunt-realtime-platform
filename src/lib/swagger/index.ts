import type { OpenAPIV3 } from "openapi-types";

import { adminOpenApiSpec } from "@/lib/swagger/admin-spec";
import { userOpenApiSpec } from "@/lib/swagger/user-spec";

export type ApiPortal = "admin" | "user";

const specs: Record<ApiPortal, OpenAPIV3.Document> = {
  admin: adminOpenApiSpec,
  user: userOpenApiSpec,
};

export function getOpenApiSpec(portal: string): OpenAPIV3.Document | null {
  if (portal in specs) {
    return specs[portal as ApiPortal];
  }
  return null;
}

export { enrichOpenApiSpec, resolveSwaggerServerUrl } from "@/lib/swagger/helpers";

export function isApiPortal(portal: string): portal is ApiPortal {
  return portal === "admin" || portal === "user";
}
