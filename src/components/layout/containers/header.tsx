"use client";
import Mode from "../mode/mode";
import User from "../user/user";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Box, Button } from "@mui/material";

import { useLayoutContext } from "@/components/layout/layout-context";
import Logo from "@/components/logo/logo";
import { DEFAULTS } from "@/config";
import NiMenuSplit from "@/icons/nexture/ni-menu-split";
import { cn } from "@/lib/utils";
import { MenuShowState } from "@/types";

export default function Header() {
  const { showLeftInMobile, showLeftMobileButton, leftPrimaryCurrent, leftShowBackdrop } = useLayoutContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Box
        component="header"
        className="bg-background flex h-20 flex-none flex-row items-center sm:h-24"
        style={{ padding: `0 var(--main-padding)` }}
      >
        <Box className="flex h-full flex-row items-center">
          <Link href={DEFAULTS.appRoot}>
            <Logo
              variant="navbar"
              classNameFull="ms-2 hidden md:block"
              classNameMobile="ms-2 md:hidden"
            />
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="mui-fixed fixed z-20 h-24 w-full" component="header">
      <Box
        className={cn(
          "bg-background shadow-darker-xs flex h-full w-full flex-none flex-row items-center rounded-b-3xl sm:h-24",
          leftShowBackdrop && "pointer-events-none",
        )}
        style={{ padding: `0 var(--main-padding)` }}
      >
        <Box
          className={cn(
            "bg-background absolute inset-0 -z-10 rounded-b-3xl",
            leftPrimaryCurrent !== MenuShowState.Hide && "rounded-bl-none!",
          )}
        />

        <Button
          variant="text"
          size="large"
          color="text-primary"
          className={cn(
            "icon-only hover-icon-shrink [&.active]:text-primary [&.active]:bg-grey-25 hover:bg-grey-25",
            showLeftMobileButton ? "flex" : "hidden",
            leftPrimaryCurrent !== MenuShowState.Hide && "active",
          )}
          onClick={() => showLeftInMobile()}
          startIcon={<NiMenuSplit size={24} />}
        />

        <Box className="flex h-full flex-1 flex-row items-center gap-4 md:gap-6">
          <Link href={DEFAULTS.appRoot}>
            <Logo
              variant="navbar"
              classNameFull="ms-2 hidden md:block"
              classNameMobile="ms-2 md:hidden"
            />
          </Link>
        </Box>

        <Box className="flex flex-row items-center gap-1 sm:gap-2">
          <Mode />
          <User />
        </Box>
      </Box>
    </Box>
  );
}
