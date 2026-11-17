"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type AdminProfileData,
  fetchAdminProfile,
  invalidateAdminProfileCache,
} from "@/lib/cached-resources";

const DEFAULT_PROFILE: AdminProfileData = {
  name: "Admin",
  email: "",
  profilePhoto: null,
};

export function useAdminProfile() {
  const [admin, setAdmin] = useState<AdminProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    const data = await fetchAdminProfile(force);
    if (data) {
      setAdmin(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const handleUpdate = () => {
      invalidateAdminProfileCache();
      load(true);
    };

    window.addEventListener("profile-updated", handleUpdate);
    return () => window.removeEventListener("profile-updated", handleUpdate);
  }, [load]);

  return { admin, loading, refresh: () => load(true) };
}
