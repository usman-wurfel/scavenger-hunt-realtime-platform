"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DataGrid, GridActionsCellItem, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
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
  FormControl,
  Grid,
  Input,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

import {
  EventListRecord,
  EventStatusValue,
  formatEventTime12h,
} from "@/lib/events";
import { apiFetch } from "@/lib/client-fetch";
import { inputNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import NiBinFull from "@/icons/nexture/ni-bin-full";
import NiEyeOpen from "@/icons/nexture/ni-eye-open";
import NiMessage from "@/icons/nexture/ni-message";
import NiSearch from "@/icons/nexture/ni-search";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

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

export default function HuntsListManager() {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [initialLoading, setInitialLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [hunts, setHunts] = useState<EventListRecord[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<EventListRecord | null>(null);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  const handleView = useCallback(
    (id: string) => {
      setNavigatingId(id);
      router.push(`/hunts/${id}`);
    },
    [router],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchHunts = useCallback(async () => {
    setGridLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page),
        pageSize: String(paginationModel.pageSize),
        search,
      });

      const res = await apiFetch(`/api/hunts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load hunts");
      }

      setHunts((data.hunts || []) as EventListRecord[]);
      setRowCount(data.pagination?.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load hunts");
    } finally {
      setGridLoading(false);
      setInitialLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, search]);

  useEffect(() => {
    fetchHunts();
  }, [fetchHunts]);

  const handleDelete = useCallback(
    async (row: EventListRecord) => {
      const confirmed = await confirm({
        title: "Delete hunt?",
        message: `Delete "${row.huntName}"? All players and scan data will be permanently removed.`,
        confirmLabel: "Delete",
        destructive: true,
      });

      if (!confirmed) {
        return;
      }

      setDeletingId(row.id);

      try {
        const res = await apiFetch(`/api/hunts/${row.id}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to delete hunt");
        }

        toast.success(`"${row.huntName}" deleted`);
        await fetchHunts();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete hunt");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, fetchHunts],
  );

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

  const columns = useMemo<GridColDef<EventListRecord>[]>(
    () => [
      {
        field: "huntName",
        headerName: "Hunt name",
        flex: 1,
        minWidth: 130,
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "area",
        headerName: "Area",
        width: 140,
        sortable: false,
        disableColumnMenu: true,
        valueGetter: (_value, row) => row.area?.name ?? "Legacy / All",
      },
      {
        field: "location",
        headerName: "Location",
        flex: 1,
        minWidth: 120,
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "huntDate",
        headerName: "Date",
        width: 110,
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "huntTime",
        headerName: "Time",
        width: 100,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => formatEventTime12h(String(params.value)),
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        sortable: false,
        disableColumnMenu: true,
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
        width: 80,
        align: "center",
        headerAlign: "center",
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "actions",
        type: "actions",
        headerName: "",
        width: 132,
        align: "center",
        headerAlign: "center",
        sortable: false,
        disableColumnMenu: true,
        resizable: false,
        getActions: (params) => {
          const actions = [
            <GridActionsCellItem
              key="view"
              icon={
                navigatingId === params.id ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <NiEyeOpen size={18} />
                )
              }
              label="View"
              showInMenu={false}
              disabled={navigatingId !== null || deletingId !== null || broadcastSending}
              onClick={() => handleView(String(params.id))}
            />,
          ];

          if (params.row.status === "started") {
            actions.push(
              <GridActionsCellItem
                key="message"
                icon={<NiMessage size={18} />}
                label="Message players"
                showInMenu={false}
                disabled={navigatingId !== null || deletingId !== null || broadcastSending}
                onClick={() => {
                  if (params.row.status !== "started") return;
                  setBroadcastTarget(params.row);
                  setBroadcastText("");
                }}
              />,
            );
          }

          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={
                deletingId === params.id ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <NiBinFull size={18} className="text-error" />
                )
              }
              label="Delete"
              showInMenu={false}
              disabled={navigatingId !== null || deletingId !== null || broadcastSending}
              className="text-error"
              onClick={() => handleDelete(params.row)}
            />,
          );

          return actions;
        },
      },
    ],
    [broadcastSending, deletingId, handleDelete, handleView, navigatingId],
  );

  if (initialLoading) {
    return (
      <Box className="flex justify-center py-20">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {dialog}
      {navigatingId && (
        <Box
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/20"
          aria-live="polite"
          aria-busy="true"
        >
          <CircularProgress size={40} />
        </Box>
      )}

      <Grid container spacing={5}>
        <Grid size={12}>
          <Typography variant="h1" component="h1">
            Hunts
          </Typography>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Box className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Typography variant="h6">All hunts</Typography>
                <FormControl className="outlined alert-types-search w-full sm:max-w-sm" variant="standard">
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name, location, or code..."
                    inputProps={{ ...inputNoAutofill, "aria-label": "Search hunts" }}
                    startAdornment={
                      <InputAdornment position="start">
                        <NiSearch size={18} />
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </Box>

              <Box className="w-full min-w-0 overflow-hidden rounded-2xl">
                <DataGrid
                  className="full-page dense alert-types-grid"
                  rows={hunts}
                  columns={columns}
                  getRowId={(row) => row.id}
                  autoHeight
                  loading={gridLoading}
                  rowCount={rowCount}
                  paginationMode="server"
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  disableColumnFilter
                  disableColumnSelector
                  disableDensitySelector
                  showCellVerticalBorder={false}
                  showColumnVerticalBorder={false}
                  columnHeaderHeight={44}
                  rowHeight={52}
                  getRowSpacing={(params) => ({
                    top: params.isFirstVisible ? 0 : 8,
                    bottom: params.isLastVisible ? 0 : 0,
                  })}
                  sx={{
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
                  }}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
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
    </>
  );
}
