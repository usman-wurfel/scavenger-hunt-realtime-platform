import { ContentType, MenuType } from "./types";

import { ModeVariant, ThemeVariant } from "@/constants";

export const DEFAULTS = {
  appRoot: "/dashboard",
  locale: "en",
  themeColor: "theme-green" as ThemeVariant,
  themeMode: "light" as ModeVariant,
  contentType: ContentType.Boxed,
  leftMenuType: MenuType.Comfort,
  leftMenuWidth: {
    [MenuType.Minimal]: { primary: 60, secondary: 260 },
    [MenuType.Comfort]: { primary: 116, secondary: 260 },
    [MenuType.SingleLayer]: { primary: 280, secondary: 0 },
  },
  transitionDuration: 150,
};
