"use client";

import { useEffect, useState } from "react";

import { Typography } from "@mui/material";

import { useBranding } from "@/hooks/use-branding";
import { withCacheBust } from "@/lib/branding-assets";
import { cn } from "@/lib/utils";

export default function Logo({
  classNameFull,
  classNameMobile,
  variant = "brand",
}: {
  classNameFull?: string;
  classNameMobile?: string;
  variant?: "navbar" | "brand";
}) {
  const { branding } = useBranding();
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [branding.logo, branding.updatedAt]);

  const logoSrc = withCacheBust(branding.logo, branding.updatedAt);

  const initials = branding.appName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showLogo = Boolean(logoSrc) && !logoFailed;

  const logoImageClass =
    variant === "navbar"
      ? "size-14 shrink-0 bg-transparent object-contain sm:size-[4.5rem]"
      : "size-20 bg-background-paper object-contain sm:size-24";

  return (
    <>
      <span className={cn("inline-flex items-center", classNameFull)}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={logoSrc}
            src={logoSrc!}
            alt={branding.appName}
            width={110}
            height={110}
            className={logoImageClass}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Typography variant="h6" component="span" className="text-primary font-bold tracking-tight">
            {branding.appName}
          </Typography>
        )}
      </span>

      <span className={cn("inline-flex items-center", classNameMobile)}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${logoSrc}-mobile`}
            src={logoSrc!}
            alt={branding.appName}
            width={110}
            height={110}
            className={variant === "navbar" ? "size-14 shrink-0 bg-transparent object-contain" : logoImageClass}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Typography variant="h6" component="span" className="text-primary font-bold">
            {initials}
          </Typography>
        )}
      </span>
    </>
  );
}