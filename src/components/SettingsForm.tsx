"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

import { invalidateBrandingCache, setBrandingCache } from "@/lib/cached-resources";
import { apiFetch } from "@/lib/client-fetch";
import { formNoAutofill, inputNoAutofill, numberInputProps, acceptMinOneFtInput } from "@/lib/form-autofill";
import { APP_TIMEZONE_OPTIONS } from "@/lib/timezone";
import { toast } from "@/lib/toast";

import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

interface AppSettings {
  appName: string;
  logo: string | null;
  favicon: string | null;
  applicationLogo: string | null;
  playerNearbyRadius: number;
  timezone: string;
  copyrightText: string;
}

const BRANDING_UPLOAD_SPECS = {
  logo: {
    label: "Logo",
    dimensions: "110 × 110 px",
    width: 110,
    height: 110,
    description: "Displayed in the admin panel navbar",
    previewSize: 88,
  },
  favicon: {
    label: "Favicon",
    dimensions: "16 × 16 px",
    width: 16,
    height: 16,
    description: "Shown as the browser tab icon",
    previewSize: 32,
  },
} as const;

function ImageUpload({
  type,
  value,
  onChange,
}: {
  value: string;
  type: keyof typeof BRANDING_UPLOAD_SPECS;
  onChange: (url: string) => void;
}) {
  const spec = BRANDING_UPLOAD_SPECS[type];
  const { label, dimensions, width, height, description, previewSize } = spec;
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);
        const res = await apiFetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) {
          toast.error(data.error || "Upload failed");
          return;
        }
        onChange(data.url);
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [type, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Box>
      <Box className="mb-1 flex flex-wrap items-center gap-2">
        <Typography variant="subtitle2">{label}</Typography>
        <Typography
          variant="caption"
          component="span"
          className="bg-grey-25 text-text-secondary rounded-md px-2 py-0.5 font-medium"
        >
          {dimensions}
        </Typography>
      </Box>
      <Typography variant="caption" className="text-text-secondary mb-2 block">
        {description} · PNG, JPG, WEBP, or SVG · Max 2MB
      </Typography>
      <Box className="flex items-center gap-4">
        <Box
          className="border-grey-100 bg-grey-25 flex items-center justify-center overflow-hidden rounded-xl border"
          style={{ width: previewSize + 24, height: previewSize + 24 }}
        >
          {value ? (
            <Image
              src={value}
              alt={label}
              width={width}
              height={height}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Typography variant="caption" className="text-text-secondary px-2 text-center">
              No image
            </Typography>
          )}
        </Box>
        <Box>
          <Box
            {...getRootProps()}
            className="cursor-pointer rounded-lg border border-dashed border-grey-200 px-4 py-2 text-sm"
          >
            <input {...getInputProps()} />
            {uploading ? "Uploading..." : isDragActive ? "Drop here" : "Click or drag image"}
          </Box>
          {value && (
            <Button size="small" color="error" onClick={() => onChange("")} className="mt-1">
              Remove
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function SettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppSettings>({
    appName: "",
    logo: null,
    favicon: null,
    applicationLogo: null,
    playerNearbyRadius: 100,
    timezone: "America/Chicago",
    copyrightText: "",
  });

  useEffect(() => {
    apiFetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) setForm(data.settings);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Settings saved successfully");
      if (data.settings) {
        setBrandingCache({
          appName: data.settings.appName,
          logo: data.settings.logo,
          favicon: data.settings.favicon,
          copyrightText: data.settings.copyrightText,
          updatedAt:
            typeof data.settings.updatedAt === "string"
              ? data.settings.updatedAt
              : new Date(data.settings.updatedAt).toISOString(),
        });
      } else {
        invalidateBrandingCache();
      }
      window.dispatchEvent(new Event("settings-updated"));
      router.refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex justify-center py-20">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={5}>
      <Grid size={12}>
        <Typography variant="h1" component="h1">Settings</Typography>
        <Typography variant="body2" className="text-text-secondary">
          Manage application branding and configuration
        </Typography>
      </Grid>

      <Grid size={12}>
        <form onSubmit={handleSubmit} {...formNoAutofill}>
          <Grid container spacing={3}>
            <Grid size={{ lg: 6, xs: 12 }}>
              <Card>
                <CardContent className="flex flex-col gap-4">
                  <Typography variant="h6">General</Typography>
                  <TextField
                    label="Application Name"
                    value={form.appName}
                    onChange={(e) => setForm({ ...form, appName: e.target.value })}
                    required
                    fullWidth
                    slotProps={{ htmlInput: inputNoAutofill }}
                  />
                  <TextField
                    label="Copyright Text"
                    value={form.copyrightText}
                    onChange={(e) => setForm({ ...form, copyrightText: e.target.value })}
                    fullWidth
                    slotProps={{ htmlInput: inputNoAutofill }}
                  />
                  <TextField
                    label="Player Nearby Radius (ft)"
                    type="number"
                    value={form.playerNearbyRadius}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!acceptMinOneFtInput(value)) return;
                      setForm({
                        ...form,
                        playerNearbyRadius: value === "" ? 1 : Number(value),
                      });
                    }}
                    required
                    fullWidth
                    slotProps={{ htmlInput: numberInputProps }}
                  />
                  <Autocomplete
                    options={APP_TIMEZONE_OPTIONS}
                    value={
                      APP_TIMEZONE_OPTIONS.find((option) => option.value === form.timezone) ??
                      (form.timezone
                        ? { value: form.timezone, label: form.timezone.replace(/_/g, " ") }
                        : null)
                    }
                    onChange={(_event, option) => {
                      if (option) setForm({ ...form, timezone: option.value });
                    }}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    filterOptions={(options, state) => {
                      const query = state.inputValue.trim().toLowerCase();
                      if (!query) return options;
                      return options.filter(
                        (option) =>
                          option.label.toLowerCase().includes(query) ||
                          option.value.toLowerCase().includes(query),
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Timezone"
                        required
                        placeholder="Search timezone..."
                        inputProps={{
                          ...params.inputProps,
                          ...inputNoAutofill,
                        }}
                      />
                    )}
                    fullWidth
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ lg: 6, xs: 12 }}>
              <Card>
                <CardContent className="flex flex-col gap-6">
                  <Typography variant="h6">Branding</Typography>
                  <ImageUpload type="logo" value={form.logo || ""} onChange={(url) => setForm({ ...form, logo: url || null })} />
                  <ImageUpload type="favicon" value={form.favicon || ""} onChange={(url) => setForm({ ...form, favicon: url || null })} />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={12}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Grid>
    </Grid>
  );
}
