"use client";

import { Suspense } from "react";

import { Box } from "@mui/material";

import Loading from "@/app/loading";
import Mode from "@/components/layout/mode/mode";

export default function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <Box className="bg-waves relative min-h-screen bg-cover bg-center">
      <Box className="absolute top-4 right-4 z-10">
        <Mode />
      </Box>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </Box>
  );
}
