"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div
            style={{
              maxWidth: 720,
              width: "100%",
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              border: "1px solid #fecaca",
            }}
          >
            <h1 style={{ margin: "0 0 8px", color: "#dc2626" }}>Critical Application Error</h1>
            <p style={{ margin: "0 0 16px", color: "#64748b" }}>
              The application encountered a critical error. Details are shown below.
            </p>

            <div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <strong>Message</strong>
              <p style={{ margin: "8px 0 0", color: "#b91c1c", wordBreak: "break-all", fontFamily: "monospace" }}>
                {error.message || "Unknown error"}
              </p>

              {error.digest && (
                <>
                  <strong style={{ display: "block", marginTop: 12 }}>Digest</strong>
                  <p style={{ margin: "8px 0 0", fontFamily: "monospace", wordBreak: "break-all" }}>{error.digest}</p>
                </>
              )}

              {isDev && error.stack && (
                <>
                  <strong style={{ display: "block", marginTop: 12 }}>Stack Trace (dev only)</strong>
                  <pre
                    style={{
                      margin: "8px 0 0",
                      maxHeight: 240,
                      overflow: "auto",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      background: "rgba(0,0,0,0.04)",
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    {error.stack}
                  </pre>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={reset}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
