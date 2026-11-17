export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function buildHuntQrScanUrl(eventCode: string): string {
  const normalizedCode = eventCode.trim().toUpperCase();
  return `${getAppBaseUrl()}/scan/${encodeURIComponent(normalizedCode)}`;
}

/** Local uploads as relative paths so images work on any host (localhost, LAN IP, domain). */
export function toAbsoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    try {
      const { pathname } = new URL(path);
      if (pathname.startsWith("/uploads/")) {
        return pathname;
      }
    } catch {
      return path;
    }
    return path;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function toAbsoluteUrlWithBase(
  path: string | null | undefined,
  base: string = getAppBaseUrl(),
): string | null {
  const assetPath = toAbsoluteUrl(path);
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const normalizedBase = base.replace(/\/$/, "");
  return `${normalizedBase}${assetPath}`;
}
