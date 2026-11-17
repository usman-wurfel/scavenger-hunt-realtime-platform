import { MenuItem } from "@/types";

export const leftMenuItems: MenuItem[] = [
  {
    id: "dashboard",
    icon: "NiHome",
    label: "menu-dashboard",
    description: "menu-dashboard-description",
    color: "text-primary",
    href: "/dashboard",
  },
  {
    id: "alert-types",
    icon: "NiFire",
    label: "menu-alert-types",
    description: "menu-alert-types-description",
    color: "text-primary",
    href: "/alert-types",
  },
  {
    id: "hunts",
    icon: "NiCalendar",
    label: "menu-hunts",
    description: "menu-hunts-description",
    color: "text-primary",
    href: "/hunts",
  },
  {
    id: "areas",
    icon: "NiMap",
    label: "menu-areas",
    description: "menu-areas-description",
    color: "text-primary",
    href: "/areas",
  },
  {
    id: "broadcast",
    icon: "NiMessage",
    label: "menu-broadcast",
    description: "menu-broadcast-description",
    color: "text-primary",
    href: "/broadcast",
  },
  {
    id: "settings",
    icon: "NiSettings",
    label: "menu-settings",
    color: "text-primary",
    href: "/settings",
  },
];

export const leftMenuBottomItems: MenuItem[] = [
  { id: "profile", label: "menu-profile", href: "/profile", icon: "NiUser" },
];
