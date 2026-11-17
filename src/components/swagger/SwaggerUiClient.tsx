"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import "swagger-ui-react/swagger-ui.css";
import "@/style/swagger-ui-overrides.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function SwaggerUiClient({ portal }: { portal: "admin" | "user" }) {
  const specUrl = useMemo(() => `/api/docs/${portal}/openapi`, [portal]);

  return (
    <div className="swagger-docs-light">
      <SwaggerUI
        url={specUrl}
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        persistAuthorization
        tryItOutEnabled
        {...({ syntaxHighlight: { activated: false } } as Record<string, unknown>)}
        requestInterceptor={(request) => {
          request.credentials = "same-origin";

          if (request.method?.toUpperCase() === "GET" && request.url.includes("/api/")) {
            const url = new URL(request.url, window.location.origin);
            url.searchParams.set("_", String(Date.now()));
            request.url = `${url.pathname}${url.search}`;
          }

          return request;
        }}
      />
    </div>
  );
}
