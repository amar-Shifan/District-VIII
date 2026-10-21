"use client";

import Script from "next/script";

const SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14";

declare global {
  interface Window {
    SwaggerUIBundle?: (options: { url: string; dom_id: string; deepLinking: boolean }) => unknown;
  }
}

/** Swagger UI for /api/docs, loaded from a pinned CDN build so it never ships in the app bundle. */
export function SwaggerDocs() {
  return (
    <div data-admin-root className="min-h-dvh bg-white">
      <link rel="stylesheet" href={`${SWAGGER_UI}/swagger-ui.css`} />
      <div id="swagger-ui" />
      <Script
        src={`${SWAGGER_UI}/swagger-ui-bundle.js`}
        strategy="afterInteractive"
        onLoad={() => window.SwaggerUIBundle?.({ url: "/api/docs", dom_id: "#swagger-ui", deepLinking: true })}
      />
    </div>
  );
}
