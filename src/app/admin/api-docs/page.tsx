import { Box, Typography } from "@mui/material";

import SwaggerUiClient from "@/components/swagger/SwaggerUiClient";

export default function AdminApiDocsPage() {
  return (
    <Box className="min-h-screen bg-white">
      <Box className="border-grey-100 border-b px-6 py-4">
        <Typography variant="h5" component="h1" className="font-bold">
          Admin API Documentation
        </Typography>
        <Typography variant="body2" className="text-text-secondary">
          Authorize: paste token only (do not type Bearer).
        </Typography>
      </Box>
      <SwaggerUiClient portal="admin" />
    </Box>
  );
}
