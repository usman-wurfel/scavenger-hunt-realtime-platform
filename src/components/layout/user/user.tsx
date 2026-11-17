"use client";

import UserModeSwitch from "./user-mode-switch";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useTranslations } from "use-intl";

import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  Fade,
  ListItemIcon,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Popper from "@mui/material/Popper";

import { useAdminProfile } from "@/hooks/use-admin-profile";
import NiSettings from "@/icons/nexture/ni-settings";
import NiUser from "@/icons/nexture/ni-user";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function User() {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { admin } = useAdminProfile();

  const handleToggle = () => setOpen((prev) => !prev);

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorRef.current?.contains(event.target as HTMLElement)) return;
    setOpen(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/sign-in");
    router.refresh();
  };

  const initials = getInitials(admin.name || "A");

  const avatarClassName = cn(
    "large border border-grey-100 bg-background-paper text-primary",
    open && "ms-0.5 h-8! w-8!",
  );

  const avatar = (
    <Avatar
      className={avatarClassName}
      src={admin.profilePhoto || undefined}
      alt={admin.name}
    >
      {initials}
    </Avatar>
  );

  return (
    <>
      <Box ref={anchorRef}>
        <Button
          variant="text"
          color="text-primary"
          className={cn(
            "group hover:bg-grey-25 ms-2 hidden gap-2 rounded-lg py-0! pe-0! hover:py-1! hover:pe-1.5! md:flex",
            open && "active bg-grey-25 py-1! pe-1.5!",
          )}
          onClick={handleToggle}
        >
          <Box className="max-w-32 truncate">{admin.name}</Box>
          {avatar}
        </Button>

        <Button
          variant="text"
          size="large"
          color="text-primary"
          className={cn(
            "hover:bg-grey-25 icon-only hover-icon-shrink [&.active]:text-primary group ms-1 me-1 p-0! hover:p-1.5! md:hidden",
            open && "active bg-grey-25 p-1.5!",
          )}
          onClick={handleToggle}
          startIcon={
            <Avatar
              className={cn("large border border-grey-100 bg-background-paper text-primary", open && "h-7! w-7!")}
              src={admin.profilePhoto || undefined}
              alt={admin.name}
            >
              {initials}
            </Avatar>
          }
        />
      </Box>

      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-end" className="mt-3!" transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Box>
              <ClickAwayListener onClickAway={handleClose}>
                <Card className="shadow-darker-sm!">
                  <CardContent>
                    <Box className="w-64 sm:w-72">
                      <Box className="mb-4 flex flex-col items-center text-center">
                        <Avatar
                          className="large border border-grey-100 bg-background-paper text-primary mb-2 h-16! w-16!"
                          src={admin.profilePhoto || undefined}
                          alt={admin.name}
                        >
                          {initials}
                        </Avatar>
                        <Typography variant="subtitle1">{admin.name}</Typography>
                        <Typography variant="body2" className="text-text-secondary truncate max-w-full">
                          {admin.email}
                        </Typography>
                      </Box>

                      <MenuList className="p-0">
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            router.push("/profile");
                          }}
                        >
                          <ListItemIcon>
                            <NiUser size={20} />
                          </ListItemIcon>
                          {t("user-profile")}
                        </MenuItem>
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            router.push("/settings");
                          }}
                        >
                          <ListItemIcon>
                            <NiSettings size={20} />
                          </ListItemIcon>
                          {t("menu-settings")}
                        </MenuItem>

                        <Divider className="large" />
                        <UserModeSwitch />
                      </MenuList>

                      <Button
                        onClick={handleLogout}
                        variant="outlined"
                        size="tiny"
                        color="grey"
                        className="w-full mt-4"
                      >
                        {t("user-sign-out")}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </ClickAwayListener>
            </Box>
          </Fade>
        )}
      </Popper>
    </>
  );
}
