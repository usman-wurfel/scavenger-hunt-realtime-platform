"use client";

import { useEffect } from "react";

import { useBranding } from "@/hooks/use-branding";
import { withCacheBust } from "@/lib/branding-assets";

function upsertFaviconLink(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.href = href;
}

export default function FaviconUpdater() {
  const { branding } = useBranding();

  useEffect(() => {
    const faviconSrc = withCacheBust(branding.favicon, branding.updatedAt);

    if (!faviconSrc) {
      return;
    }

    upsertFaviconLink("icon", faviconSrc);
    upsertFaviconLink("shortcut icon", faviconSrc);
    upsertFaviconLink("apple-touch-icon", faviconSrc);
  }, [branding.favicon, branding.updatedAt]);

  return null;
}
