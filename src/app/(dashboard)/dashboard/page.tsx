import { Breadcrumbs, Grid, Typography } from "@mui/material";

import DashboardManager from "@/components/DashboardManager";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <Grid container spacing={5}>
      <Grid size={12}>
        <Typography variant="h1" component="h1" className="mb-0">
          Dashboard
        </Typography>
        <Breadcrumbs>
          <Typography variant="body2">Home</Typography>
          <Typography variant="body2">Dashboard</Typography>
        </Breadcrumbs>
      </Grid>

      <Grid size={12}>
        <DashboardManager adminName={session?.name ?? "Admin"} />
      </Grid>
    </Grid>
  );
}
