"use client";

import { useEffect } from "react";

import { Box, Button, Paper, Typography } from "@mui/material";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <Box className="flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4">
      <Paper elevation={3} className="bg-background-paper max-w-3xl rounded-4xl p-8 md:p-12">
        <Typography variant="h4" component="h1" className="mb-2 font-bold text-red-600">
          Application Error
        </Typography>

        <Typography variant="body1" color="text.secondary" className="mb-4">
          Something went wrong. Error details are shown below.
        </Typography>

        <Box className="bg-grey-50 mb-4 rounded-xl border border-red-200 p-4">
          <Typography variant="subtitle2" className="mb-1 font-semibold">
            Message
          </Typography>
          <Typography variant="body2" component="p" className="font-mono break-all text-red-700">
            {error.message || "Unknown error"}
          </Typography>

          {error.digest && (
            <>
              <Typography variant="subtitle2" className="mt-3 mb-1 font-semibold">
                Digest
              </Typography>
              <Typography variant="body2" component="p" className="font-mono break-all">
                {error.digest}
              </Typography>
            </>
          )}

          {isDev && error.stack && (
            <>
              <Typography variant="subtitle2" className="mt-3 mb-1 font-semibold">
                Stack Trace (dev only)
              </Typography>
              <Box
                component="pre"
                className="max-h-64 overflow-auto rounded-lg bg-black/5 p-3 text-xs leading-relaxed whitespace-pre-wrap"
              >
                {error.stack}
              </Box>
            </>
          )}
        </Box>

        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Paper>
    </Box>
  );
}
