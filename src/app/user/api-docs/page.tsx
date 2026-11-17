import { Metadata } from "next";
import { Box, Typography } from "@mui/material";

import SwaggerUiClient from "@/components/swagger/SwaggerUiClient";

export const metadata: Metadata = {
  title: "Scavenger Hunt User",
  description: "Scavenger Hunt User API Documentation",
};

export default function UserApiDocsPage() {
  return (
    <Box className="min-h-screen bg-white">
      <Box className="border-grey-100 border-b px-6 py-4">
        <Typography variant="h5" component="h1" className="font-bold">
          Scavenger Hunt User
        </Typography>
        <Typography variant="body2" className="text-text-secondary">
          Player mobile app APIs — public endpoints, no authentication required.
        </Typography>
      </Box>
      <SwaggerUiClient portal="user" />
    </Box>
  );
}
