"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
  EventHistoryRecord,
  EventStatusValue,
  formatEventTime12h,
} from "@/lib/events";
import type {
  DashboardDayActivity,
  DashboardHuntListType,
  DashboardOverview,
  DashboardStats,
  DashboardTopHunt,
} from "@/lib/dashboard-server";
import { apiFetch } from "@/lib/client-fetch";
import { inputNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";
import NiCalendar from "@/icons/nexture/ni-calendar";
import NiChartLine from "@/icons/nexture/ni-chart-line";
import NiEyeOpen from "@/icons/nexture/ni-eye-open";
import NiFlash from "@/icons/nexture/ni-flash";
import NiMessage from "@/icons/nexture/ni-message";
import NiStopwatch from "@/icons/nexture/ni-stopwatch";
import NiUserPlus from "@/icons/nexture/ni-user-plus";

const STATUS_LABELS: Record<EventStatusValue, string> = {
  scheduled: "Scheduled",
  started: "Started",
  ended: "Ended",
};

const STATUS_COLORS: Record<EventStatusValue, "default" | "warning" | "success"> = {
  scheduled: "warning",
  started: "success",
  ended: "default",
};

const TAB_TYPES: DashboardHuntListType[] = ["today", "upcoming", "ended"];

const DASHBOARD_GRID_SX = {
  border: "none",
  outline: "none",
  width: "100%",
  "& .MuiDataGrid-main": { border: "none" },
  "& .MuiDataGrid-withBorderColor": { borderColor: "transparent" },
  "& .MuiDataGrid-columnHeaders": { mb: 0, minHeight: "44px !important" },
  "& .MuiDataGrid-columnHeader": { border: "none" },
  "& .MuiDataGrid-filler": { display: "none" },
  "& .MuiDataGrid-scrollbarFiller": { display: "none" },
  "& .MuiDataGrid-footerContainer": { mt: 2, border: "none" },
  "& .MuiDataGrid-cell--pinnedRight": { borderLeft: "none" },
  "& .MuiDataGrid-columnHeader--pinnedRight": { borderLeft: "none" },
} as const;

type DashboardManagerProps = {
  adminName: string;
};

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  accent?: string;
};

function StatCard({ label, value, hint, icon, accent }: StatCardProps) {
  return (
    <Card className="h-full min-h-[132px]">
      <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
        <Box className="flex items-start justify-between gap-3">
          <Box>
            <Typography variant="body2" className="text-text-secondary">
              {label}
            </Typography>
            <Typography variant="h4" className="mt-1 font-semibold">
              {value}
            </Typography>
          </Box>
          <Box
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            sx={{ bgcolor: accent ?? "action.hover", color: "primary.main" }}
          >
            {icon}
          </Box>
        </Box>
        {hint ? (
          <Typography variant="caption" className="text-text-secondary">
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

type BroadcastTarget = {
  id: string;
  huntName: string;
  status: EventStatusValue;
};

function huntColumns(
  onView: (id: string) => void,
  onMessage: (row: EventHistoryRecord) => void,
): GridColDef<EventHistoryRecord>[] {
  return [
    {
      field: "huntName",
      headerName: "Hunt",
      flex: 1,
      minWidth: 140,
      sortable: false,
    },
    {
      field: "huntTime",
      headerName: "Time",
      width: 100,
      sortable: false,
      renderCell: (params) => formatEventTime12h(String(params.value)),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Chip
          size="small"
          label={STATUS_LABELS[params.value as EventStatusValue]}
          color={STATUS_COLORS[params.value as EventStatusValue]}
          variant="outlined"
        />
      ),
    },
    {
      field: "participantCount",
      headerName: "Players",
      width: 90,
      align: "center",
      headerAlign: "center",
      sortable: false,
    },
    {
      field: "actions",
      headerName: "",
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Box className="flex items-center gap-1">
          <Button
            size="small"
            startIcon={<NiEyeOpen size={16} />}
            onClick={() => onView(params.row.id)}
          >
            View
          </Button>
          {params.row.status === "started" ? (
            <Tooltip title="Message joined players">
              <IconButton
                size="small"
                aria-label="Message joined players"
                onClick={() => onMessage(params.row)}
              >
                <NiMessage size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      ),
    },
  ];
}

function topHuntColumns(
  onView: (id: string) => void,
  onMessage: (row: DashboardTopHunt) => void,
): GridColDef<DashboardTopHunt>[] {
  return [
    {
      field: "huntName",
      headerName: "Hunt",
      flex: 1,
      minWidth: 160,
      sortable: false,
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Chip
          size="small"
          label={STATUS_LABELS[params.value as EventStatusValue] ?? params.value}
          color={STATUS_COLORS[params.value as EventStatusValue] ?? "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "participantCount",
      headerName: "Players",
      width: 90,
      align: "center",
      headerAlign: "center",
      sortable: false,
    },
    {
      field: "scanCount",
      headerName: "Scans",
      width: 90,
      align: "center",
      headerAlign: "center",
      sortable: false,
    },
    {
      field: "actions",
      headerName: "",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box className="flex items-center gap-1">
          <Button
            size="small"
            startIcon={<NiEyeOpen size={16} />}
            onClick={() => onView(params.row.id)}
          >
            Open
          </Button>
          {params.row.status === "started" ? (
            <Tooltip title="Message joined players">
              <IconButton
                size="small"
                aria-label="Message joined players"
                onClick={() => onMessage(params.row)}
              >
                <NiMessage size={18} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      ),
    },
  ];
}

export default function DashboardManager({ adminName }: DashboardManagerProps) {
  const theme = useTheme();
  const router = useRouter();
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [tab, setTab] = useState(0);
  const [tabRows, setTabRows] = useState<EventHistoryRecord[]>([]);
  const [tabRowCount, setTabRowCount] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabPaginationModel, setTabPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 6,
  });
  const [topHunts, setTopHunts] = useState<DashboardTopHunt[]>([]);
  const [topRowCount, setTopRowCount] = useState(0);
  const [topLoading, setTopLoading] = useState(false);
  const [topPaginationModel, setTopPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 6,
  });
  const [broadcastTarget, setBroadcastTarget] = useState<BroadcastTarget | null>(null);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/dashboard");
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error || "Failed to load dashboard");
      }

      setOverview(body as DashboardOverview);
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchHuntList = useCallback(
    async (type: DashboardHuntListType, pagination: GridPaginationModel, setLoading: (value: boolean) => void) => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          type,
          page: String(pagination.page),
          pageSize: String(pagination.pageSize),
        });

        const res = await apiFetch(`/api/dashboard/hunts?${params.toString()}`);
        const body = await res.json();

        if (!res.ok || !body.success) {
          throw new Error(body.error || "Failed to load hunts");
        }

        if (type === "top") {
          setTopHunts((body.topHunts || []) as DashboardTopHunt[]);
          setTopRowCount(body.pagination?.total ?? 0);
          return;
        }

        setTabRows((body.hunts || []) as EventHistoryRecord[]);
        setTabRowCount(body.pagination?.total ?? 0);
      } catch (err) {
        if (type === "top") {
          setTopHunts([]);
          setTopRowCount(0);
        } else {
          setTabRows([]);
          setTabRowCount(0);
        }
        setError(err instanceof Error ? err.message : "Failed to load hunts");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!overview) return;
    fetchHuntList("top", topPaginationModel, setTopLoading);
  }, [fetchHuntList, overview, topPaginationModel]);

  useEffect(() => {
    if (!overview) return;
    fetchHuntList(TAB_TYPES[tab], tabPaginationModel, setTabLoading);
  }, [fetchHuntList, overview, tab, tabPaginationModel]);

  const handleViewHunt = useCallback(
    (id: string) => {
      router.push(`/hunts/${id}`);
    },
    [router],
  );

  const openBroadcastDialog = useCallback((row: { id: string; huntName: string; status: string }) => {
    if (row.status !== "started") {
      toast.error("Only started hunts can send messages to joined players");
      return;
    }
    setBroadcastTarget({
      id: row.id,
      huntName: row.huntName,
      status: row.status as EventStatusValue,
    });
    setBroadcastText("");
  }, []);

  const closeBroadcastDialog = useCallback(() => {
    if (broadcastSending) return;
    setBroadcastTarget(null);
    setBroadcastText("");
  }, [broadcastSending]);

  const sendBroadcast = useCallback(async () => {
    if (!broadcastTarget) return;

    if (broadcastTarget.status !== "started") {
      toast.error("Only started hunts can send messages to joined players");
      setBroadcastTarget(null);
      setBroadcastText("");
      return;
    }

    const trimmed = broadcastText.trim();
    if (!trimmed) {
      toast.error("Message is required");
      return;
    }

    setBroadcastSending(true);
    try {
      const res = await apiFetch(`/api/hunts/${broadcastTarget.id}/broadcast-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      toast.success(
        `Message sent to ${data.sent ?? 0} player${data.sent === 1 ? "" : "s"}`,
      );
      setBroadcastTarget(null);
      setBroadcastText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setBroadcastSending(false);
    }
  }, [broadcastTarget, broadcastText]);

  const columns = useMemo(
    () => huntColumns(handleViewHunt, openBroadcastDialog),
    [handleViewHunt, openBroadcastDialog],
  );
  const topColumns = useMemo(
    () => topHuntColumns(handleViewHunt, openBroadcastDialog),
    [handleViewHunt, openBroadcastDialog],
  );

  const pieData = useMemo(() => {
    if (!overview) return [];

    return [
      {
        id: 0,
        value: overview.huntsByStatus.scheduled,
        label: "Scheduled",
        color: theme.palette.warning.main,
      },
      {
        id: 1,
        value: overview.huntsByStatus.started,
        label: "Active",
        color: theme.palette.success.main,
      },
      {
        id: 2,
        value: overview.huntsByStatus.ended,
        label: "Ended",
        color: theme.palette.text.disabled,
      },
    ].filter((item) => item.value > 0);
  }, [overview, theme.palette.success.main, theme.palette.text.disabled, theme.palette.warning.main]);

  const activityChart = useMemo(() => {
    const activity: DashboardDayActivity[] = overview?.activityLast7Days ?? [];
    return {
      labels: activity.map((day) => day.label),
      joins: activity.map((day) => day.joins),
      scans: activity.map((day) => day.scans),
      hunts: activity.map((day) => day.hunts),
    };
  }, [overview?.activityLast7Days]);

  const handleRefresh = useCallback(() => {
    loadOverview();
    fetchHuntList("top", topPaginationModel, setTopLoading);
    fetchHuntList(TAB_TYPES[tab], tabPaginationModel, setTabLoading);
  }, [fetchHuntList, loadOverview, tab, tabPaginationModel, topPaginationModel]);

  const handleTabChange = useCallback((_: unknown, value: number) => {
    setTab(value);
    setTabPaginationModel((current) => ({ ...current, page: 0 }));
  }, []);

  if (overviewLoading) {
    return (
      <Box className="flex min-h-64 items-center justify-center">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !overview) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <Typography color="error">{error || "Dashboard data unavailable"}</Typography>
          <Button variant="contained" onClick={loadOverview}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats: DashboardStats = overview.stats;

  return (
    <Grid container spacing={4}>
      <Grid size={12}>
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <Box>
              <Typography variant="h4" className="mb-1">
                Welcome back, {adminName}
              </Typography>
              <Typography variant="body1" className="text-text-secondary">
                Live overview of hunts, players, scans, and upcoming activity.
              </Typography>
            </Box>
            <Box className="flex flex-wrap gap-2">
              <Button component={Link} href="/hunts" variant="contained">
                Manage Hunts
              </Button>
              <Button variant="outlined" onClick={handleRefresh}>
                Refresh
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard
              label="Today's Hunts"
              value={stats.todayHunts}
              hint={`${stats.activeHunts} active right now`}
              icon={<NiCalendar size={22} />}
              accent="rgba(var(--primary), 0.12)"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard
              label="Active Hunts"
              value={stats.activeHunts}
              hint="Currently started"
              icon={<NiFlash size={22} />}
              accent="rgba(34, 197, 94, 0.12)"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <StatCard
              label="Upcoming"
              value={stats.upcomingHunts}
              hint={`${stats.scheduledHunts} total scheduled`}
              icon={<NiStopwatch size={22} />}
              accent="rgba(245, 158, 11, 0.12)"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
            <StatCard
              label="Total Hunts"
              value={stats.totalHunts}
              hint={`${stats.endedHunts} completed`}
              icon={<NiChartLine size={22} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
            <StatCard
              label="Total Players"
              value={stats.totalParticipants}
              hint={`${stats.todayParticipants} joined today`}
              icon={<NiUserPlus size={22} />}
            />
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card className="h-full">
          <CardContent className="p-5">
            <Typography variant="h6" className="mb-1">
              Hunt Status
            </Typography>
            <Typography variant="body2" className="text-text-secondary mb-4">
              Distribution across all hunts
            </Typography>
            {pieData.length > 0 ? (
              <PieChart
                height={260}
                series={[
                  {
                    data: pieData,
                    innerRadius: 50,
                    outerRadius: 90,
                    paddingAngle: 3,
                    cornerRadius: 4,
                  },
                ]}
                slotProps={{ legend: { position: { vertical: "bottom", horizontal: "center" } } }}
              />
            ) : (
              <Box className="flex h-52 items-center justify-center">
                <Typography className="text-text-secondary">No hunt data yet</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card className="h-full">
          <CardContent className="p-5">
            <Typography variant="h6" className="mb-1">
              Last 7 Days Activity
            </Typography>
            <Typography variant="body2" className="text-text-secondary mb-4">
              Hunts scheduled, player joins, and QR scans
            </Typography>
            <BarChart
              height={280}
              xAxis={[{ scaleType: "band", data: activityChart.labels }]}
              series={[
                { data: activityChart.hunts, label: "Hunts", color: theme.palette.primary.main },
                { data: activityChart.joins, label: "Joins", color: theme.palette.info.main },
                { data: activityChart.scans, label: "Scans", color: theme.palette.success.main },
              ]}
              margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardContent className="p-4">
            <Typography variant="h6" className="mb-3 px-1">
              Top Hunts by Players
            </Typography>
            <Box className="w-full min-w-0 overflow-hidden rounded-2xl">
              <DataGrid
                autoHeight
                rows={topHunts}
                columns={topColumns}
                getRowId={(row) => row.id}
                loading={topLoading}
                rowCount={topRowCount}
                paginationMode="server"
                paginationModel={topPaginationModel}
                onPaginationModelChange={setTopPaginationModel}
                pageSizeOptions={[6, 10, 25]}
                disableRowSelectionOnClick
                showCellVerticalBorder={false}
                showColumnVerticalBorder={false}
                hideFooter={topRowCount <= topPaginationModel.pageSize}
                sx={DASHBOARD_GRID_SX}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardContent className="p-0">
            <Box className="border-grey-100 border-b px-5 pt-4">
              <Tabs value={tab} onChange={handleTabChange}>
                <Tab label={`Today (${stats.todayDashboardHunts})`} />
                <Tab label={`Upcoming (${stats.upcomingHunts})`} />
                <Tab label={`Recently Ended (${stats.endedHunts})`} />
              </Tabs>
            </Box>

            <Box className="p-4">
              <Box className="w-full min-w-0 overflow-hidden rounded-2xl">
                <DataGrid
                  autoHeight
                  rows={tabRows}
                  columns={columns}
                  getRowId={(row) => row.id}
                  loading={tabLoading}
                  rowCount={tabRowCount}
                  paginationMode="server"
                  paginationModel={tabPaginationModel}
                  onPaginationModelChange={setTabPaginationModel}
                  pageSizeOptions={[6, 10, 25]}
                  disableRowSelectionOnClick
                  showCellVerticalBorder={false}
                  showColumnVerticalBorder={false}
                  hideFooter={tabRowCount <= tabPaginationModel.pageSize}
                  sx={DASHBOARD_GRID_SX}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={!!broadcastTarget} onClose={closeBroadcastDialog} fullWidth maxWidth="sm">
        <DialogTitle>Message joined players</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-text-secondary mb-3">
            {broadcastTarget
              ? `Send a push notification to all players who joined "${broadcastTarget.huntName}". This message is not saved.`
              : null}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label="Message"
            value={broadcastText}
            onChange={(event) => setBroadcastText(event.target.value)}
            disabled={broadcastSending}
            slotProps={{ htmlInput: inputNoAutofill }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBroadcastDialog} disabled={broadcastSending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void sendBroadcast()} disabled={broadcastSending}>
            {broadcastSending ? "Sending..." : "Send to all joined"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
