"use client";

import { Suspense } from "react";

import Loading from "@/app/loading";
import ContentWrapper from "@/components/layout/containers/content-wrapper";
import Header from "@/components/layout/containers/header";
import Main from "@/components/layout/containers/main";
import LeftMenu from "@/components/layout/menu/left-menu";
import MenuBackdrop from "@/components/layout/menu/menu-backdrop";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <LeftMenu />
      <Main>
        <ContentWrapper>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </ContentWrapper>
      </Main>
      <MenuBackdrop />
    </>
  );
}
