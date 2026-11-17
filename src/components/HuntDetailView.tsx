"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { DataGrid, GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
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
  IconButton,
  Input,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { DEFAULT_MESSAGE_COLOR } from "@/lib/alert-types";
import {
  EventDetailRecord,
  EventParticipantRecord,
  EventStatusValue,
  formatEventTime12h,
  ProximityAlertRecord,
} from "@/lib/events";
import { apiFetch } from "@/lib/client-fetch";
import { inputNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";
import NiBadgeCheck from "@/icons/nexture/ni-badge-check";
import NiChevronLeft from "@/icons/nexture/ni-chevron-left";
import NiMessages from "@/icons/nexture/ni-messages";
import NiSearch from "@/icons/nexture/ni-search";
import NiStar from "@/icons/nexture/ni-star";
import type { HuntLiveMapMqtt } from "@/components/HuntLiveMap";

const HuntLiveMap = dynamic(() => import("@/components/HuntLiveMap"), { ssr: false });

const PARTICIPANT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const dataGridSx = {
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
} as const;

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

const PRIZE_STATUS_LABELS: Record<EventParticipantRecord["prizeClaimStatus"], string> = {
  none: "No message",
  waiting: "Waiting",
  claimed: "Claimed",
};

const PRIZE_STATUS_COLORS: Record<
  EventParticipantRecord["prizeClaimStatus"],
  "default" | "warning" | "success"
> = {
  none: "default",
  waiting: "warning",
  claimed: "success",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  });
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <Typography variant="body2" className="text-text-secondary min-w-[140px] shrink-0 font-medium">
        {label}
      </Typography>
      <Typography variant="body2" component="div" className="min-w-0 flex-1">
        {value}
      </Typography>
    </Box>
  );
}

function StarRankBadge({
  rank,
  starClassName,
}: {
  rank: number;
  starClassName: string;
}) {
  return (
    <Box
      className="relative inline-flex h-6 w-6 items-center justify-center"
      aria-label={`Rank ${rank}`}
    >
      <NiStar size={24} variant="contained" className={starClassName} />
      <Box
        component="span"
        className="pointer-events-none absolute font-heading"
        sx={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#141414",
          fontSize: "9px",
          lineHeight: 1,
          fontWeight: 900,
        }}
      >
        {rank}
      </Box>
    </Box>
  );
}

function ScanRankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <StarRankBadge rank={1} starClassName="text-[#D4AF37]" />;
  }

  if (rank === 2) {
    return <StarRankBadge rank={2} starClassName="text-success" />;
  }

  if (rank === 3) {
    return <StarRankBadge rank={3} starClassName="text-info" />;
  }

  return (
    <Typography variant="body2" className="text-text-secondary font-medium">
      #{rank}
    </Typography>
  );
}

type HuntDetailViewProps = {
  huntId: string;
};

export default function HuntDetailView({ huntId }: HuntDetailViewProps) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [hunt, setHunt] = useState<EventDetailRecord | null>(null);
  const [mqtt, setMqtt] = useState<HuntLiveMapMqtt | null>(null);
  const [participantSearchInput, setParticipantSearchInput] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantPagination, setParticipantPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [messageTarget, setMessageTarget] = useState<EventParticipantRecord | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  const fetchHunt = useCallback(async () => {
    if (hasLoadedRef.current) {
      setParticipantsLoading(true);
    } else {
      setInitialLoading(true);
    }

    try {
      const params = new URLSearchParams({
        page: String(participantPagination.page + 1),
        pageSize: String(participantPagination.pageSize),
        search: participantSearch,
      });

      const res = await apiFetch(`/api/hunts/${huntId}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load hunt details");
      }

      setHunt(data.hunt as EventDetailRecord);
      if (data.mqtt?.wsUrl) {
        setMqtt({
          wsUrl: String(data.mqtt.wsUrl),
          clientId: String(data.mqtt.clientId ?? `admin-${huntId}`),
          username: String(data.mqtt.username ?? "admin"),
          password: data.mqtt.password ?? null,
          topics: { positions: data.mqtt.topics?.positions ?? null },
        });
      } else {
        setMqtt(null);
      }
      setLoadError("");
      hasLoadedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load hunt details";
      setHunt(null);
      setLoadError(message);
      toast.error(message);
    } finally {
      setInitialLoading(false);
      setParticipantsLoading(false);
    }
  }, [huntId, participantPagination.page, participantPagination.pageSize, participantSearch]);

  useEffect(() => {
    fetchHunt();
  }, [fetchHunt]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParticipantSearch(participantSearchInput.trim());
      setParticipantPagination((current) => ({ ...current, page: 0 }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [participantSearchInput]);

  const openMessageDialog = useCallback((participant: EventParticipantRecord) => {
    setMessageTarget(participant);
    setMessageText(participant.winnerMessage ?? "");
  }, []);

  const closeMessageDialog = useCallback(() => {
    if (messageSending) return;
    setMessageTarget(null);
    setMessageText("");
  }, [messageSending]);

  const sendWinnerMessage = useCallback(async () => {
    if (!messageTarget) return;
    const trimmed = messageText.trim();
    if (!trimmed) {
      toast.error("Message is required");
      return;
    }

    setMessageSending(true);
    try {
      const res = await apiFetch(
        `/api/hunts/${huntId}/participants/${messageTarget.id}/winner-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      toast.success("Message sent to winner");
      setMessageTarget(null);
      setMessageText("");
      await fetchHunt();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setMessageSending(false);
    }
  }, [fetchHunt, huntId, messageTarget, messageText]);

  const markClaimed = useCallback(
    async (participant: EventParticipantRecord) => {
      if (participant.prizeClaimStatus === "claimed") return;
      setClaimingId(participant.id);
      try {
        const res = await apiFetch(`/api/hunts/${huntId}/participants/${participant.id}/claim`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to mark as claimed");
        }
        toast.success("Marked as claimed");
        await fetchHunt();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark as claimed");
      } finally {
        setClaimingId(null);
      }
    },
    [fetchHunt, huntId],
  );

  const participantColumns = useMemo<GridColDef<EventParticipantRecord>[]>(
    () => [
      {
        field: "scanRank",
        headerName: "Rank",
        width: 96,
        align: "center",
        headerAlign: "center",
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          if (params.value === null || params.value === undefined) {
            return "—";
          }

          return (
            <Box className="flex h-full w-full items-center justify-center">
              <ScanRankBadge rank={Number(params.value)} />
            </Box>
          );
        },
      },
      {
        field: "username",
        headerName: "Username",
        width: 110,
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "deviceId",
        headerName: "Device ID",
        flex: 1,
        minWidth: 160,
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "prizeClaimStatus",
        headerName: "Prize status",
        width: 120,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<EventParticipantRecord>) => {
          if (params.row.scanRank !== 1) {
            return "—";
          }
          const status = params.row.prizeClaimStatus ?? "none";
          return (
            <Chip
              size="small"
              label={PRIZE_STATUS_LABELS[status]}
              color={PRIZE_STATUS_COLORS[status]}
              variant="outlined"
            />
          );
        },
      },
      {
        field: "joinedAt",
        headerName: "Joined",
        width: 170,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => formatDateTime(String(params.value)),
      },
      {
        field: "scannedAt",
        headerName: "Scanned",
        width: 170,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => (params.value ? formatDateTime(String(params.value)) : "—"),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 110,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<EventParticipantRecord>) => {
          if (params.row.scanRank !== 1) {
            return null;
          }

          const isClaimed = params.row.prizeClaimStatus === "claimed";
          const isClaiming = claimingId === params.row.id;

          return (
            <Box className="flex h-full items-center justify-center gap-0.5">
              <Tooltip
                title={
                  isClaimed
                    ? "Prize already claimed — messaging is locked"
                    : "Send a prize message to this first-place winner"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    aria-label="Send message to first place"
                    disabled={isClaimed}
                    onClick={() => openMessageDialog(params.row)}
                  >
                    <NiMessages size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip
                title={
                  isClaimed
                    ? "Prize already marked as claimed"
                    : "Mark this first-place prize as claimed"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    aria-label="Mark first place as claimed"
                    disabled={isClaimed || isClaiming}
                    onClick={() => void markClaimed(params.row)}
                    color={isClaimed ? "success" : "default"}
                  >
                    {isClaiming ? <CircularProgress size={16} /> : <NiBadgeCheck size={18} />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [claimingId, markClaimed, openMessageDialog],
  );

  const paginatedParticipants = hunt?.participants ?? [];
  const participantRowCount = hunt?.participantsPagination.total ?? 0;

  const alertColumns = useMemo<GridColDef<ProximityAlertRecord>[]>(
    () => [
      {
        field: "distanceFt",
        headerName: "Distance",
        width: 100,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => `${params.value} ft`,
      },
      {
        field: "message",
        headerName: "Message",
        flex: 1,
        minWidth: 120,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Box className="flex h-full items-center gap-2">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: params.row.messageColor || DEFAULT_MESSAGE_COLOR,
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" className="truncate">
              {params.value}
            </Typography>
          </Box>
        ),
      },
    ],
    [],
  );

  if (initialLoading) {
    return (
      <Box className="flex justify-center py-20">
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !hunt) {
    return (
      <Grid container spacing={5}>
        <Grid size={12}>
          <Button component={Link} href="/hunts" startIcon={<NiChevronLeft size={18} />} className="mb-4">
            Back to hunts
          </Button>
          <Card>
            <CardContent>
              <Typography variant="body1" className="text-error">
                {loadError || "Hunt not found"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={5}>
      <Grid size={12}>
        <Button component={Link} href="/hunts" startIcon={<NiChevronLeft size={18} />} className="mb-2">
          Back to hunts
        </Button>
        <Box className="flex flex-wrap items-center gap-3">
          <Typography variant="h1" component="h1">
            {hunt.huntName}
          </Typography>
          <Chip
            size="small"
            label={STATUS_LABELS[hunt.status]}
            color={STATUS_COLORS[hunt.status]}
            variant="outlined"
          />
        </Box>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <Typography variant="h6">Hunt details</Typography>
            <DetailRow label="Location" value={hunt.location} />
            <DetailRow label="Latitude" value={hunt.latitude} />
            <DetailRow label="Longitude" value={hunt.longitude} />
            <HuntLiveMap
              huntId={hunt.id}
              latitude={Number(hunt.latitude)}
              longitude={Number(hunt.longitude)}
              radiusFt={Number(hunt.playerNearbyRadiusFt)}
              mqtt={mqtt}
              live={hunt.status === "started"}
            />
            <DetailRow label="Area" value={hunt.area?.name ?? "Legacy / All areas"} />
            <DetailRow label="Hunt date" value={hunt.huntDate} />
            <DetailRow label="Hunt time" value={formatEventTime12h(hunt.huntTime)} />
            <DetailRow label="Hunt code" value={hunt.huntCode} />
            <DetailRow label="Player nearby radius (ft)" value={`${hunt.playerNearbyRadiusFt} ft`} />
            <DetailRow label="Player clue" value={hunt.playerClue} />
            <DetailRow label="Proximity alerts" value={hunt.proximityAlerts.length} />
            <DetailRow label="Players joined" value={hunt.participantCount} />
            <DetailRow label="Created" value={formatDateTime(hunt.createdAt)} />
            <DetailRow label="Last updated" value={formatDateTime(hunt.updatedAt)} />
            {hunt.qrCodeUrl && (
              <DetailRow
                label="QR code"
                value={
                  <Box
                    component="img"
                    src={hunt.qrCodeUrl}
                    alt={`QR code for ${hunt.huntCode}`}
                    sx={{ width: 160, height: 160, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
                  />
                }
              />
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardContent>
            <Box className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Box className="flex flex-wrap items-center gap-2">
                <Typography variant="h6">Participants</Typography>
                <Chip
                  size="small"
                  label={`${hunt.participantCount} player${hunt.participantCount === 1 ? "" : "s"}`}
                  variant="outlined"
                />
              </Box>
              <FormControl className="outlined alert-types-search w-full sm:max-w-sm" variant="standard">
                <Input
                  value={participantSearchInput}
                  onChange={(event) => setParticipantSearchInput(event.target.value)}
                  placeholder="Search by rank, username, or device ID..."
                  inputProps={{ ...inputNoAutofill, "aria-label": "Search participants" }}
                  startAdornment={
                    <InputAdornment position="start">
                      <NiSearch size={18} />
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Box>
            {hunt.participantCount === 0 ? (
              <Typography variant="body2" className="text-text-secondary">
                No players have joined this hunt yet.
              </Typography>
            ) : (
              <Box className="w-full min-w-0 overflow-hidden rounded-2xl">
                <DataGrid
                  className="full-page dense alert-types-grid"
                  rows={paginatedParticipants}
                  columns={participantColumns}
                  getRowId={(row) => row.id}
                  autoHeight
                  loading={participantsLoading}
                  rowCount={participantRowCount}
                  paginationMode="server"
                  paginationModel={participantPagination}
                  onPaginationModelChange={setParticipantPagination}
                  pageSizeOptions={PARTICIPANT_PAGE_SIZE_OPTIONS}
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
                  sx={dataGridSx}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" className="mb-4">
              Proximity alerts
            </Typography>
            <Box className="max-w-2xl min-w-0 overflow-hidden rounded-2xl">
              <DataGrid
                className="full-page dense alert-types-grid"
                rows={hunt.proximityAlerts}
                columns={alertColumns}
                getRowId={(row) => row.id}
                autoHeight
                hideFooter={hunt.proximityAlerts.length <= 10}
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
                sx={dataGridSx}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={!!messageTarget} onClose={closeMessageDialog} fullWidth maxWidth="sm">
        <DialogTitle>Message first-place winner</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-text-secondary mb-3">
            {messageTarget
              ? `Send a message to ${messageTarget.username}.`
              : null}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label="Message"
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            disabled={messageSending}
            slotProps={{ htmlInput: inputNoAutofill }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMessageDialog} disabled={messageSending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void sendWinnerMessage()} disabled={messageSending}>
            {messageSending ? "Sending..." : "Send message"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
