"use client";
import { PropsWithChildren, useEffect } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";

import { setToastEnqueue } from "@/lib/toast";
import NiCheckSquare from "@/icons/nexture/ni-check-square";
import NiCrossSquare from "@/icons/nexture/ni-cross-square";
import NiExclamationSquare from "@/icons/nexture/ni-exclamation-square";
import NiInfoSquare from "@/icons/nexture/ni-info-square";

const iconVariants = {
  success: <NiCheckSquare className="me-2" />,
  error: <NiCrossSquare className="me-2" />,
  warning: <NiExclamationSquare className="me-2" />,
  info: <NiInfoSquare className="me-2" />,
};

function SnackbarConfigurator() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setToastEnqueue(enqueueSnackbar);
    return () => setToastEnqueue(null);
  }, [enqueueSnackbar]);

  return null;
}

export default function SnackbarWrapper({ children }: PropsWithChildren) {
  return (
    <SnackbarProvider
      maxSnack={4}
      iconVariant={iconVariants}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={4000}
    >
      <SnackbarConfigurator />
      {children}
    </SnackbarProvider>
  );
}
