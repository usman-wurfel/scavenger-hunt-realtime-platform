"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

import NiEyeClose from "@/icons/nexture/ni-eye-close";
import NiEyeOpen from "@/icons/nexture/ni-eye-open";
import { apiFetch } from "@/lib/client-fetch";
import { invalidateAdminProfileCache } from "@/lib/cached-resources";
import { formNoAutofill, inputNoAutofill, passwordNoAutofill } from "@/lib/form-autofill";
import { toast } from "@/lib/toast";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfilePhotoUpload({
  value,
  name,
  onChange,
}: {
  value: string;
  name: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "profilePhoto");

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
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: uploading,
  });

  const initials = getInitials(name || "A");

  return (
    <Box className="mb-6">
      <Box className="mb-1 flex flex-wrap items-center gap-2">
        <Typography variant="subtitle2">Profile Photo</Typography>
        <Typography
          variant="caption"
          component="span"
          className="bg-grey-25 text-text-secondary rounded-md px-2 py-0.5 font-medium"
        >
          200 × 200 px
        </Typography>
      </Box>
      <Typography variant="caption" className="text-text-secondary mb-3 block">
        Shown in the navbar and profile menu · PNG, JPG, WEBP, or SVG · Max 2MB
      </Typography>

      <Box className="mb-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Avatar
          className="border-grey-100 h-24! w-24! shrink-0 border text-2xl text-primary"
          src={value || undefined}
          alt={name}
          sx={{
            bgcolor: "#ffffff",
            "& .MuiAvatar-img": {
              objectFit: "cover",
              bgcolor: "#ffffff",
            },
          }}
        >
          {initials}
        </Avatar>

        <Box className="w-full sm:w-auto">
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

export default function ProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [profile, setProfile] = useState({ name: "", email: "", profilePhoto: "" });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    apiFetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.admin) {
          setProfile({
            name: data.admin.name,
            email: data.admin.email,
            profilePhoto: data.admin.profilePhoto || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          profilePhoto: profile.profilePhoto || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully");
      invalidateAdminProfileCache();
      window.dispatchEvent(new Event("profile-updated"));
      router.refresh();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);

    try {
      const res = await apiFetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Failed to update password");
    } finally {
      setSavingPassword(false);
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
        <Typography variant="h1" component="h1">
          Profile
        </Typography>
        <Typography variant="body2" className="text-text-secondary">
          Update your account details and password
        </Typography>
      </Grid>

      <Grid size={{ lg: 6, xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" className="mb-4">
              Account Details
            </Typography>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" {...formNoAutofill}>
              <ProfilePhotoUpload
                value={profile.profilePhoto}
                name={profile.name}
                onChange={(url) => setProfile({ ...profile, profilePhoto: url })}
              />
              <TextField
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                fullWidth
                slotProps={{ htmlInput: inputNoAutofill }}
              />
              <TextField
                label="Email"
                type="email"
                value={profile.email}
                required
                fullWidth
                disabled
                helperText="Email cannot be changed"
                slotProps={{ htmlInput: inputNoAutofill }}
              />
              <Button type="submit" variant="contained" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ lg: 6, xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" className="mb-4">
              Change Password
            </Typography>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4" {...formNoAutofill}>
              <TextField
                label="Current Password"
                type={showPassword ? "text" : "password"}
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: passwordNoAutofill }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <NiEyeClose size="small" /> : <NiEyeOpen size="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="New Password"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: passwordNoAutofill }}
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                fullWidth
                slotProps={{ htmlInput: passwordNoAutofill }}
              />
              <Button type="submit" variant="outlined" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
