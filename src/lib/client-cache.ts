const memoryCache = new Map<string, unknown>();

export const CACHE_KEYS = {
  branding: "cache:branding",
  adminProfile: "cache:admin-profile",
} as const;

export function getCache<T>(key: string): T | null {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data: T };
    memoryCache.set(key, parsed.data);
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  memoryCache.set(key, data);

  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(key, JSON.stringify({ data }));
  } catch {
    // Ignore quota errors; in-memory cache still works.
  }
}

export function clearCache(key: string): void {
  memoryCache.delete(key);

  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(key);
}
