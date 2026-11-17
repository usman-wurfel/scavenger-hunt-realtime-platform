import { OptionsObject, SnackbarKey, VariantType } from "notistack";

type EnqueueSnackbar = (message: string, options?: OptionsObject) => SnackbarKey;

let enqueueSnackbarRef: EnqueueSnackbar | null = null;

export function setToastEnqueue(fn: EnqueueSnackbar | null) {
  enqueueSnackbarRef = fn;
}

function show(variant: VariantType, message: string, options?: OptionsObject) {
  enqueueSnackbarRef?.(message, {
    variant,
    autoHideDuration: 4000,
    ...options,
  });
}

export const toast = {
  success: (message: string, options?: OptionsObject) => show("success", message, options),
  error: (message: string, options?: OptionsObject) => show("error", message, options),
  info: (message: string, options?: OptionsObject) => show("info", message, options),
  warning: (message: string, options?: OptionsObject) => show("warning", message, options),
};
