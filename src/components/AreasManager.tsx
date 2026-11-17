"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

import type { HuntAreaRecord } from "@/lib/hunt-areas";
import { apiFetch } from "@/lib/client-fetch";
import { toast } from "@/lib/toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import NiBinFull from "@/icons/nexture/ni-bin-full";
import NiPen from "@/icons/nexture/ni-pen";
import NiPlus from "@/icons/nexture/ni-plus";

type AdminArea = HuntAreaRecord & { huntCount: number; subscriberCount: number };
type AreaForm = {
  id?: string;
  name: string;
  slug: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: AreaForm = {
  name: "",
  slug: "",
  sortOrder: "0",
  isActive: true,
};

export default function AreasManager() {
  const { confirm, dialog } = useConfirmDialog();
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AreaForm>(emptyForm);

  const loadAreas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/areas");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load areas");
      setAreas(data.areas ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load areas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const endpoint = form.id ? `/api/admin/areas/${form.id}` : "/api/admin/areas";
      const res = await apiFetch(endpoint, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          sortOrder: Number(form.sortOrder),
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save area");
      toast.success(form.id ? "Area updated" : "Area added");
      setForm(emptyForm);
      await loadAreas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save area");
    } finally {
      setSaving(false);
    }
  };

  const remove = useCallback(
    async (area: AdminArea) => {
      const approved = await confirm({
        title: "Delete area?",
        message:
          area.huntCount > 0
            ? `"${area.name}" is assigned to hunts and cannot be deleted. Disable it instead.`
            : `Delete "${area.name}"? Player subscriptions for it will also be removed.`,
        confirmLabel: area.huntCount > 0 ? "Close" : "Delete",
        destructive: area.huntCount === 0,
      });
      if (!approved || area.huntCount > 0) return;

      const res = await apiFetch(`/api/admin/areas/${area.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to delete area");
        return;
      }
      toast.success("Area deleted");
      await loadAreas();
    },
    [confirm, loadAreas],
  );

  const columns = useMemo<GridColDef<AdminArea>[]>(
    () => [
      { field: "name", headerName: "Area", flex: 1, minWidth: 160 },
      { field: "slug", headerName: "Slug", flex: 1, minWidth: 150 },
      { field: "huntCount", headerName: "Hunts", width: 90 },
      { field: "subscriberCount", headerName: "Subscribers", width: 120 },
      {
        field: "isActive",
        headerName: "Status",
        width: 100,
        valueFormatter: (value: boolean) => (value ? "Active" : "Disabled"),
      },
      {
        field: "actions",
        type: "actions",
        width: 100,
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="edit"
            icon={<NiPen size={18} />}
            label="Edit"
            onClick={() =>
              setForm({
                id: row.id,
                name: row.name,
                slug: row.slug,
                sortOrder: String(row.sortOrder),
                isActive: row.isActive,
              })
            }
          />,
          <GridActionsCellItem
            key="delete"
            icon={<NiBinFull size={18} />}
            label="Delete"
            onClick={() => void remove(row)}
          />,
        ],
      },
    ],
    [remove],
  );

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" className="mb-1">
                {form.id ? "Edit area" : "Add area"}
              </Typography>
              <Typography variant="body2" className="text-text-secondary mb-5">
                Hunts and player notifications are filtered by these areas.
              </Typography>
              <Box component="form" onSubmit={submit} className="flex flex-col gap-4">
                <TextField
                  required
                  label="Area name"
                  value={form.name}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                />
                <TextField
                  label="Slug (optional)"
                  value={form.slug}
                  onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))}
                  helperText="Generated from the name when left blank"
                />
                <TextField
                  label="Sort order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, sortOrder: event.target.value }))
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, isActive: event.target.checked }))
                      }
                    />
                  }
                  label="Available to players"
                />
                <Box className="flex gap-2">
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} /> : <NiPlus size={18} />}
                    disabled={saving}
                  >
                    {form.id ? "Save changes" : "Add area"}
                  </Button>
                  {form.id ? (
                    <Button onClick={() => setForm(emptyForm)} disabled={saving}>
                      Cancel
                    </Button>
                  ) : null}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" className="mb-4">
                Hunt areas
              </Typography>
              <DataGrid
                rows={areas}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                autoHeight
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {dialog}
    </>
  );
}
