import { CACHE_KEYS, clearCache, getCache, setCache } from "@/lib/client-cache";
import { apiFetch } from "@/lib/client-fetch";

export interface BrandingData {
  appName: string;
  logo: string | null;
  favicon: string | null;
  copyrightText: string;
  updatedAt: string;
}

export interface AdminProfileData {
  name: string;
  email: string;
  profilePhoto: string | null;
  updatedAt?: string;
}

let memoryBranding: BrandingData | null = null;

export async function fetchBranding(force = false): Promise<BrandingData> {
  if (!force && memoryBranding) {
    return memoryBranding;
  }

  const res = await fetch("/api/settings/branding", { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Branding API failed (${res.status})`);
  }

  const branding: BrandingData = {
    appName: data.appName,
    logo: data.logo,
    favicon: data.favicon,
    copyrightText: data.copyrightText,
    updatedAt: data.updatedAt,
  };

  memoryBranding = branding;
  return branding;
}

export async function fetchAdminProfile(force = false): Promise<AdminProfileData | null> {
  if (!force) {
    const cached = getCache<AdminProfileData>(CACHE_KEYS.adminProfile);
    if (cached) return cached;
  }

  const res = await apiFetch("/api/profile");
  const data = await res.json();

  if (!res.ok || !data.success || !data.admin) {
    return null;
  }

  const profile: AdminProfileData = {
    name: data.admin.name,
    email: data.admin.email,
    profilePhoto: data.admin.profilePhoto ?? null,
    updatedAt: data.admin.updatedAt,
  };

  setCache(CACHE_KEYS.adminProfile, profile);
  return profile;
}

export function invalidateBrandingCache(): void {
  memoryBranding = null;
  clearCache(CACHE_KEYS.branding);
}

export function setBrandingCache(branding: BrandingData): void {
  memoryBranding = branding;
}

export function invalidateAdminProfileCache(): void {
  clearCache(CACHE_KEYS.adminProfile);
}
