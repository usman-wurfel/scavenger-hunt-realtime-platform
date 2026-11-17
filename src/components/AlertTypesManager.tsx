"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridPaginationModel,
  GridRowModes,
  GridRowModesModel,
  GridRowParams,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  Input,
  InputAdornment,
  Typography,
} from "@mui/material";

import { AlertTypeRecord, DEFAULT_MESSAGE_COLOR } from "@/lib/alert-types";
import { apiFetch } from "@/lib/client-fetch";
import {
  acceptMinOneFtInput,
  formNoAutofill,
  inputNoAutofill,
  numberInputProps,
} from "@/lib/form-autofill";
import { toast } from "@/lib/toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import NiBinFull from "@/icons/nexture/ni-bin-full";
import NiCheck from "@/icons/nexture/ni-check";
import NiCross from "@/icons/nexture/ni-cross";
import NiPen from "@/icons/nexture/ni-pen";
import NiPlus from "@/icons/nexture/ni-plus";
import NiSearch from "@/icons/nexture/ni-search";

type NewAlertForm = {
  distanceFt: string;
  message: string;
  messageColor: string;
};

const emptyForm: NewAlertForm = {
  distanceFt: "",
  message: "",
  messageColor: DEFAULT_MESSAGE_COLOR,
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export default function AlertTypesManager() {
  const { confirm, dialog } = useConfirmDialog();
  const [initialLoading, setInitialLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<AlertTypeRecord[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [form, setForm] = useState<NewAlertForm>(emptyForm);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchAlerts = useCallback(async () => {
    setGridLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page),
        pageSize: String(paginationModel.pageSize),
        search,
      });

      const res = await apiFetch(`/api/alert-types?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load alerts");
      }

      setAlerts((data.alertTypes || []) as AlertTypeRecord[]);
      setRowCount(data.pagination?.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setGridLoading(false);
      setInitialLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, search]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const res = await apiFetch("/api/alert-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceFt: Number(form.distanceFt),
          message: form.message,
          messageColor: form.messageColor,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to create alert");
        return;
      }

      toast.success("Alert added");
      setForm(emptyForm);
      setPaginationModel((current) => ({ ...current, page: 0 }));
      await fetchAlerts();
    } catch {
      toast.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = useCallback((id: string) => {
    setRowModesModel((current) => ({ ...current, [id]: { mode: GridRowModes.Edit } }));
  }, []);

  const handleCancelClick = useCallback((id: string) => {
    setRowModesModel((current) => ({
      ...current,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    }));
  }, []);

  const handleDelete = useCallback(
    async (row: AlertTypeRecord) => {
      const confirmed = await confirm({
        title: "Delete alert?",
        message: `Delete the ${row.distanceFt} ft alert? This action cannot be undone.`,
        confirmLabel: "Delete",
        destructive: true,
      });

      if (!confirmed) {
        return;
      }

      try {
        const res = await apiFetch(`/api/alert-types/${row.id}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.error || "Failed to delete alert");
          return;
        }

        toast.success("Alert deleted");
        await fetchAlerts();
      } catch {
        toast.error("Failed to delete alert");
      }
    },
    [confirm, fetchAlerts],
  );

  const processRowUpdate = async (newRow: AlertTypeRecord) => {
    const res = await apiFetch(`/api/alert-types/${newRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distanceFt: Number(newRow.distanceFt),
        message: newRow.message,
        messageColor: newRow.messageColor || DEFAULT_MESSAGE_COLOR,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to update alert");
    }

    toast.success("Alert updated");
    const updated = data.alertType as AlertTypeRecord;
    setAlerts((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    return updated;
  };

  const columns = useMemo<GridColDef<AlertTypeRecord>[]>(
    () => [
      {
        field: "distanceFt",
        headerName: "Distance (ft)",
        width: 160,
        type: "number",
        editable: true,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => `${params.value} ft`,
      },
      {
        field: "message",
        headerName: "Alert message",
        flex: 1,
        minWidth: 240,
        editable: true,
        sortable: false,
        disableColumnMenu: true,
      },
      {
        field: "messageColor",
        headerName: "Text color",
        width: 130,
        editable: true,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Box className="flex h-full items-center gap-2">
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: "4px",
                bgcolor: params.value || DEFAULT_MESSAGE_COLOR,
                border: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" className="text-text-secondary">
              {params.value || DEFAULT_MESSAGE_COLOR}
            </Typography>
          </Box>
        ),
        renderEditCell: (params) => (
          <Box className="flex h-full items-center">
            <Box
              component="input"
              type="color"
              value={params.value || DEFAULT_MESSAGE_COLOR}
              onChange={(event) =>
                params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: (event.target as HTMLInputElement).value,
                })
              }
              sx={{
                width: 40,
                height: 32,
                border: "none",
                cursor: "pointer",
                bgcolor: "transparent",
                p: 0,
              }}
            />
          </Box>
        ),
      },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 108,
        align: "right",
        headerAlign: "right",
        sortable: false,
        disableColumnMenu: true,
        resizable: false,
        getActions: (params: GridRowParams<AlertTypeRecord>) => {
          const isEditing = rowModesModel[params.id]?.mode === GridRowModes.Edit;

          if (isEditing) {
            return [
              <GridActionsCellItem
                key="save"
                icon={<NiCheck size={18} />}
                label="Save"
                showInMenu={false}
                onClick={() =>
                  setRowModesModel((current) => ({
                    ...current,
                    [params.id]: { mode: GridRowModes.View },
                  }))
                }
              />,
              <GridActionsCellItem
                key="cancel"
                icon={<NiCross size={18} />}
                label="Cancel"
                showInMenu={false}
                onClick={() => handleCancelClick(String(params.id))}
              />,
            ];
          }

          return [
            <GridActionsCellItem
              key="edit"
              icon={<NiPen size={18} />}
              label="Edit"
              showInMenu={false}
              onClick={() => handleEditClick(String(params.id))}
            />,
            <GridActionsCellItem
              key="delete"
              icon={<NiBinFull size={18} className="text-error" />}
              label="Delete"
              showInMenu={false}
              className="text-error"
              onClick={() => handleDelete(params.row)}
            />,
          ];
        },
      },
    ],
    [handleCancelClick, handleDelete, handleEditClick, rowModesModel],
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
      <Grid container spacing={5}>
      <Grid size={12}>
        <Typography variant="h1" component="h1">
          Alert Types
        </Typography>
        <Typography variant="body2" className="text-text-secondary">
          Add one alert at a time with distance in feet and the message players see.
        </Typography>
      </Grid>

      <Grid size={12}>
        <Card className="mb-4">
          <CardContent>
            <Typography variant="h6" className="mb-4">
              Add alert
            </Typography>
            <Box
              component="form"
              onSubmit={handleCreate}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
              {...formNoAutofill}
            >
              <FormControl className="outlined w-full sm:w-[180px] sm:shrink-0" variant="standard">
                <Input
                  type="number"
                  value={form.distanceFt}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (acceptMinOneFtInput(value)) {
                      setForm({ ...form, distanceFt: value });
                    }
                  }}
                  placeholder="Distance (ft)"
                  inputProps={{ ...numberInputProps, "aria-label": "Distance in feet", required: true }}
                  required
                />
              </FormControl>
              <FormControl className="outlined min-w-0 flex-1" variant="standard">
                <Input
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  placeholder='Alert message e.g. "Getting closer"'
                  inputProps={{ ...inputNoAutofill, "aria-label": "Alert message", required: true }}
                  required
                />
              </FormControl>
              <Box className="flex shrink-0 items-center gap-2 sm:w-[150px]">
                <Typography variant="body2" className="text-text-secondary whitespace-nowrap">
                  Text color
                </Typography>
                <Box
                  component="input"
                  type="color"
                  value={form.messageColor}
                  onChange={(event) => setForm({ ...form, messageColor: event.target.value })}
                  aria-label="Alert message text color"
                  sx={{
                    width: 40,
                    height: 40,
                    border: "none",
                    cursor: "pointer",
                    bgcolor: "transparent",
                    p: 0,
                  }}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving}
                startIcon={<NiPlus size={18} />}
                className="w-full shrink-0 sm:w-auto sm:min-w-[120px]"
                sx={{ marginBottom: "10px" }}
              >
                {saving ? "Adding..." : "Add"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Typography variant="h6">Saved alerts</Typography>
              <FormControl className="outlined alert-types-search w-full sm:max-w-sm" variant="standard">
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by message or distance..."
                  inputProps={{ ...inputNoAutofill, "aria-label": "Search alerts" }}
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
                rows={alerts}
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
                rowModesModel={rowModesModel}
                onRowModesModelChange={setRowModesModel}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={(err) => {
                  toast.error(err instanceof Error ? err.message : "Failed to update alert");
                }}
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
    </>
  );
}
