"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type BrandingData,
  fetchBranding,
  invalidateBrandingCache,
} from "@/lib/cached-resources";

const DEFAULT_BRANDING: BrandingData = {
  appName: "Scavenger Hunt",
  logo: null,
  favicon: null,
  copyrightText: "",
  updatedAt: "",
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchBranding(force);
      setBranding(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load branding";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const handleUpdate = () => {
      invalidateBrandingCache();
      load(true);
    };

    window.addEventListener("settings-updated", handleUpdate);
    return () => window.removeEventListener("settings-updated", handleUpdate);
  }, [load]);

  return { branding, loading, error, refresh: () => load(true) };
}
