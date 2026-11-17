import type { OpenAPIV3 } from "openapi-types";

export const SWAGGER_EXAMPLE_PATHS = {
  applicationLogo: "/uploads/applicationLogo/logo.png",
  qrCodeImage: "/uploads/qrCode/event-HUNT2026-123.png",
  scanPath: "/scan/HUNT2026",
} as const;

export function resolveSwaggerServerUrl(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const protocol =
      forwardedProto?.split(",")[0]?.trim() ??
      (new URL(request.url).protocol === "https:" ? "https" : "http");
    return `${protocol}://${host.split(",")[0]?.trim() ?? host}`.replace(/\/$/, "");
  }

  return new URL(request.url).origin.replace(/\/$/, "");
}

function setSchemaPropertyExample(
  spec: OpenAPIV3.Document,
  schemaName: string,
  propertyName: string,
  example: string,
) {
  const schema = spec.components?.schemas?.[schemaName] as OpenAPIV3.SchemaObject | undefined;
  const property = schema?.properties?.[propertyName] as OpenAPIV3.SchemaObject | undefined;

  if (property) {
    property.example = example;
  }
}

function patchExampleValues(value: unknown, serverUrl: string): unknown {
  if (typeof value === "string") {
    return value
      .replace(/^https?:\/\/localhost:3000/i, serverUrl)
      .replace(/^https?:\/\/127\.0\.0\.1:3000/i, serverUrl);
  }

  if (Array.isArray(value)) {
    return value.map((item) => patchExampleValues(item, serverUrl));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, patchExampleValues(item, serverUrl)]),
    );
  }

  return value;
}

export function enrichOpenApiSpec(spec: OpenAPIV3.Document, serverUrl: string): OpenAPIV3.Document {
  const normalizedServerUrl = serverUrl.replace(/\/$/, "");
  const enriched = patchExampleValues(structuredClone(spec), normalizedServerUrl) as OpenAPIV3.Document;

  enriched.servers = [{ url: normalizedServerUrl, description: "API server" }];

  setSchemaPropertyExample(
    enriched,
    "Event",
    "qrCodeUrl",
    SWAGGER_EXAMPLE_PATHS.qrCodeImage,
  );
  setSchemaPropertyExample(
    enriched,
    "Event",
    "qrScanUrl",
    `${normalizedServerUrl}${SWAGGER_EXAMPLE_PATHS.scanPath}`,
  );

  return enriched;
}
