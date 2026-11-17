"use client";

import { useBranding } from "@/hooks/use-branding";

import { Box, Typography } from "@mui/material";

export default function Footer() {
  const { branding } = useBranding();

  if (!branding.copyrightText) return null;

  return (
    <Box component="footer" className="flex min-h-10 items-center justify-center px-4 py-3">
      <Typography variant="caption" className="text-text-secondary text-center">
        {branding.copyrightText}
      </Typography>
    </Box>
  );
}
