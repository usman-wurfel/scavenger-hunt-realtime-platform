import { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense } from "react";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

import Loading from "@/app/loading";
import FaviconUpdater from "@/components/FaviconUpdater";
import InitialLoader from "@/components/InitialLoader";
import BackgroundWrapper from "@/components/layout/containers/background-wrapper";
import SnackbarWrapper from "@/components/layout/containers/snackbar-wrapper";
import LayoutContextProvider from "@/components/layout/layout-context";
import ThemeProvider from "@/theme/theme-provider";
import "@/style/global.css";

export const metadata: Metadata = {
  title: "Scavenger Hunt Admin",
  description: "Scavenger Hunt Admin Panel",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={{ "--inner-shadow-opacity": "0.6", "--foreground-opacity": "0.6" } as React.CSSProperties}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,400;0,500;0,600;0,700;0,800&family=Urbanist:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/initial-loader.css" />
      </head>
      <body className="antialiased">
        <FaviconUpdater />
        <InitialLoader />
        <AppRouterCacheProvider
          options={{
            key: "css",
            prepend: false,
            enableCssLayer: true,
          }}
        >
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              <LayoutContextProvider>
                <BackgroundWrapper />
                <SnackbarWrapper>
                  <Suspense fallback={<Loading />}>{children}</Suspense>
                </SnackbarWrapper>
              </LayoutContextProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
